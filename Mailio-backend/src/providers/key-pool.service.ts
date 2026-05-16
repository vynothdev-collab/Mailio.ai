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

  async acquireKey(provider: string): Promise<AcquireOutcome> {
    const now = Date.now();
    const all = this.snapshot.get(provider) ?? [];
    if (all.length === 0) {
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
        .filter(
          (k) => k.status === ApiKeyStatus.ACTIVE && k.cooldownUntil > now,
        )
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

  private readonly lastSuccessPersistedAt = new Map<string, number>();
  private readonly dirtyFailureKeys = new Set<string>();
  private readonly heartbeatMs = parseInt(
    process.env.KEY_HEARTBEAT_MS ?? '15000',
    10,
  );

  async reportSuccess(keyId: string): Promise<void> {
    const now = Date.now();

    const hadPendingFailure = this.dirtyFailureKeys.delete(keyId);

    if (!hadPendingFailure && this.heartbeatMs > 0) {
      const last = this.lastSuccessPersistedAt.get(keyId) ?? 0;
      if (now - last < this.heartbeatMs) {
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

    if (kind === 'server' || kind === 'network' || kind === 'rate-limit') {
      this.dirtyFailureKeys.add(keyId);
    }
  }
}
