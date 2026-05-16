import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisRateLimiter } from '../limiter/redis-rate-limiter.service';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { ProviderErrorKind } from './provider.interface';

export interface AcquiredKey {
  id: string;
  provider: string;
  keyValue: string;
  rlMax: number;
  rlWindowMs: number;
}

export type AcquireOutcome =
  | { ok: true; key: AcquiredKey }
  | { ok: false; retryAfterMs: number };

/** In-memory snapshot row used by the hot-path selector. */
interface KeyState {
  id: string;
  provider: string;
  keyValue: string;
  status: ApiKeyStatus;
  weight: number;
  rlMax: number;
  rlWindowMs: number;
  cooldownUntil: number; // epoch ms, 0 if none
}

/**
 * Hot-path selector for credentials. Reads its working set from an
 * in-memory snapshot maintained by KeyPoolSync so acquire() never touches
 * the DB. Per-key rate gating delegates to RedisRateLimiter, which is the
 * authoritative cross-process budget enforcer.
 *
 * Acquire algorithm:
 *   1. Filter snapshot to active, not-in-cooldown keys for the provider.
 *   2. Order by weighted round-robin using a Redis INCR cursor (so the
 *      ordering is stable across multiple worker processes).
 *   3. For each candidate, try its Redis token bucket. First grant wins.
 *   4. If all candidates have empty buckets, return the minimum retryAfter
 *      so the caller can delay precisely until *some* key has capacity.
 *
 * report*() updates DB state. KeyPoolSync picks up the change and
 * broadcasts via Pub/Sub so other processes refresh their snapshots.
 */
@Injectable()
export class KeyPoolService {
  private readonly logger = new Logger(KeyPoolService.name);

  /** provider -> ordered key snapshot. Written by KeyPoolSync. */
  private snapshot = new Map<string, KeyState[]>();

  /** Local round-robin tie-breaker when multiple keys are usable. */
  private localCursor = 0;

  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
    private readonly limiter: RedisRateLimiter,
  ) {}

  /** Called by KeyPoolSync after each DB reload. */
  setSnapshot(provider: string, keys: KeyState[]): void {
    this.snapshot.set(provider, keys);
  }

  getSnapshot(provider: string): KeyState[] {
    return this.snapshot.get(provider) ?? [];
  }

  /**
   * Pick a usable key for `provider`, atomically consuming one token from
   * its per-key bucket. Caller MUST handle the {ok:false} branch — typically
   * by delaying the job via BullMQ's worker.rateLimit(retryAfterMs).
   */
  async acquireKey(provider: string): Promise<AcquireOutcome> {
    const now = Date.now();
    const all = this.snapshot.get(provider) ?? [];
    if (all.length === 0) {
      // No keys configured at all. Fail-closed with a long retry — the
      // operator needs to add a key via the admin API. Five seconds keeps
      // the BullMQ delay set bounded.
      return { ok: false, retryAfterMs: 5000 };
    }

    // Build the candidate list, replicating each key by its weight so a
    // key with weight=3 gets 3× the round-robin slots of a weight=1 key.
    const candidates: KeyState[] = [];
    for (const k of all) {
      if (k.status !== ApiKeyStatus.ACTIVE) continue;
      if (k.cooldownUntil > now) continue;
      const w = Math.max(1, k.weight | 0);
      for (let i = 0; i < w; i++) candidates.push(k);
    }
    if (candidates.length === 0) {
      // Everyone's in cooldown or disabled — wait for the soonest recovery.
      const soonest = all
        .filter((k) => k.status === ApiKeyStatus.ACTIVE && k.cooldownUntil > now)
        .reduce(
          (min, k) => Math.min(min, k.cooldownUntil - now),
          Number.MAX_SAFE_INTEGER,
        );
      return {
        ok: false,
        retryAfterMs: soonest === Number.MAX_SAFE_INTEGER ? 5000 : soonest,
      };
    }

    // Start from a rotating offset so concurrent acquirers don't all bang
    // on the same key first.
    const start = this.localCursor++ % candidates.length;

    let minRetry = Number.MAX_SAFE_INTEGER;
    const tried = new Set<string>();

    for (let i = 0; i < candidates.length; i++) {
      const k = candidates[(start + i) % candidates.length];
      if (tried.has(k.id)) continue;
      tried.add(k.id);

      const r = await this.limiter.acquire(`provider:${provider}:${k.id}`, {
        max: k.rlMax,
        windowMs: k.rlWindowMs,
      });
      if (r.granted) {
        return {
          ok: true,
          key: {
            id: k.id,
            provider: k.provider,
            keyValue: k.keyValue,
            rlMax: k.rlMax,
            rlWindowMs: k.rlWindowMs,
          },
        };
      }
      if (r.retryAfterMs < minRetry) minRetry = r.retryAfterMs;
    }

    return {
      ok: false,
      retryAfterMs: minRetry === Number.MAX_SAFE_INTEGER ? 100 : minRetry,
    };
  }

  /**
   * Acquire up to `n` tokens for `provider`, issuing the per-key bucket
   * checks concurrently. Each AcquireOutcome corresponds to one requested
   * slot; failed slots carry the smallest retryAfter the limiter saw.
   *
   * The micro-batch worker calls this once per batch (n = INNER_CONCURRENCY)
   * instead of N times serially. The wins are:
   *
   *   1. Event-loop batching — all Lua eval round trips ride in parallel.
   *      Net wall time ≈ max(round_trips) instead of sum(round_trips).
   *   2. KeyPool round-robin offsets advance N times in one tick, spreading
   *      the load across keys the same way it would if calls were serial.
   *
   * Partial success is the norm under load — caller must handle a mix of
   * ok/!ok entries. Returns exactly `n` outcomes (order preserved).
   */
  async acquireMany(provider: string, n: number): Promise<AcquireOutcome[]> {
    if (n <= 0) return [];
    const pending: Promise<AcquireOutcome>[] = new Array<
      Promise<AcquireOutcome>
    >(n);
    for (let i = 0; i < n; i++) {
      pending[i] = this.acquireKey(provider);
    }
    return Promise.all(pending);
  }

  /**
   * In-memory per-key debounce state for reportSuccess. We persist on
   * two real signals:
   *   (a) the first success after a failure (clears failure_count fast)
   *   (b) the last persisted heartbeat is older than KEY_HEARTBEAT_MS
   *
   * Steady-state load otherwise produces N UPDATEs/sec all resetting
   * the same row's failure_count from 0 → 0 — pure write amplification
   * and row-lock contention on the hot api_keys row.
   *
   * Bookkeeping:
   *   - lastSuccessPersistedAt[keyId]: epoch ms of the LAST DB write.
   *     Updated only when we actually hit the DB. A reportSuccess
   *     within heartbeatMs of this value skips the write.
   *   - dirtyFailureKeys: set populated by reportFailure when the
   *     failure path took the key off the "known clean" track. The
   *     first reportSuccess after a failure ALWAYS persists,
   *     regardless of heartbeat, so failure_count is reset promptly.
   *
   * Previous implementation tried to inspect snapshot.failureCount,
   * but that field isn't on the in-memory KeyState shape — the
   * condition was always false and the debounce never engaged. This
   * version is bookkeeping-driven and provably correct.
   */
  private readonly lastSuccessPersistedAt = new Map<string, number>();
  private readonly dirtyFailureKeys = new Set<string>();
  private readonly heartbeatMs = parseInt(
    process.env.KEY_HEARTBEAT_MS ?? '15000',
    10,
  );

  /**
   * Mark a successful use. Debounced — see lastSuccessPersistedAt /
   * dirtyFailureKeys above for the heuristic. Set KEY_HEARTBEAT_MS=0
   * to disable debouncing entirely (legacy behaviour: every call
   * hits the DB).
   */
  async reportSuccess(keyId: string): Promise<void> {
    const now = Date.now();

    // Always persist on the first success after a known failure — clears
    // failure_count promptly so the key doesn't stay one bad call away
    // from cooldown.
    const hadPendingFailure = this.dirtyFailureKeys.delete(keyId);

    if (!hadPendingFailure && this.heartbeatMs > 0) {
      const last = this.lastSuccessPersistedAt.get(keyId) ?? 0;
      if (now - last < this.heartbeatMs) {
        // Within the heartbeat window AND no pending failure to clear —
        // skip the DB write entirely. last_used_at gets up to
        // heartbeatMs stale, acceptable for a usage timestamp.
        return;
      }
    }

    this.lastSuccessPersistedAt.set(keyId, now);
    await this.repo.update(keyId, {
      failureCount: 0,
      lastUsedAt: new Date(now),
      lastError: null,
    });
  }

  /**
   * Mark a failed use and react based on the error class:
   *   rate-limit → cooldown using provider's hint (or 30 s default)
   *   auth       → DISABLED (revoked / billing problem). Operator action.
   *   server     → increment failure_count; cooldown if it crosses threshold
   *   network    → same as server
   *   bad-request→ not a key problem; just record last_error
   */
  async reportFailure(
    keyId: string,
    kind: ProviderErrorKind,
    message: string,
    retryAfterMs?: number,
  ): Promise<void> {
    const key = await this.repo.findOne({ where: { id: keyId } });
    if (!key) return;

    const FAILURE_COOLDOWN_THRESHOLD = parseInt(
      process.env.KEY_FAILURE_COOLDOWN_THRESHOLD ?? '5',
      10,
    );
    const TRANSIENT_COOLDOWN_MS = parseInt(
      process.env.KEY_TRANSIENT_COOLDOWN_MS ?? '60000',
      10,
    );
    // When Ninja returns 429 without a Retry-After header (the common
    // case under bursty load), the previous 30000ms default cooldown
    // froze the only key for half a minute and produced an obvious
    // "verification stops, then resumes" pattern in the UI. The Redis
    // token bucket is the real budget enforcer; a brief 2000ms cooldown
    // is enough to absorb a transient burst without stalling the whole
    // pipeline. Override with KEY_RATE_LIMIT_COOLDOWN_MS if a particular
    // provider truly requires longer.
    const DEFAULT_RATE_LIMIT_COOLDOWN_MS = parseInt(
      process.env.KEY_RATE_LIMIT_COOLDOWN_MS ?? '2000',
      10,
    );
    const RATE_LIMIT_COOLDOWN_MS =
      retryAfterMs ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS;

    const update: Partial<ApiKey> = { lastError: message };

    switch (kind) {
      case 'rate-limit':
        update.status = ApiKeyStatus.COOLDOWN;
        update.cooldownUntil = new Date(Date.now() + RATE_LIMIT_COOLDOWN_MS);
        break;
      case 'auth':
        update.status = ApiKeyStatus.DISABLED;
        break;
      case 'server':
      case 'network': {
        const nextCount = (key.failureCount ?? 0) + 1;
        update.failureCount = nextCount;
        if (nextCount >= FAILURE_COOLDOWN_THRESHOLD) {
          update.status = ApiKeyStatus.COOLDOWN;
          update.cooldownUntil = new Date(Date.now() + TRANSIENT_COOLDOWN_MS);
          update.failureCount = 0;
          this.logger.warn(
            `Key ${keyId}: ${nextCount} consecutive failures → cooldown ${TRANSIENT_COOLDOWN_MS}ms`,
          );
        }
        break;
      }
      case 'bad-request':
        // Not the key's fault; do nothing structural.
        break;
    }

    await this.repo.update(keyId, update);

    // Mark the key dirty so the next reportSuccess persists immediately
    // (bypassing the heartbeat debounce). This restores failure_count to
    // 0 / clears last_error promptly when the key recovers, rather than
    // waiting up to heartbeatMs.
    if (kind === 'server' || kind === 'network' || kind === 'rate-limit') {
      this.dirtyFailureKeys.add(keyId);
    }
  }
}
