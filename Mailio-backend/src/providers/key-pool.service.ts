import { Injectable } from '@nestjs/common';
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

interface KeyState {
  id: string;
  provider: string;
  keyValue: string;
  status: ApiKeyStatus;
  weight: number;
  rlMax: number;
  rlWindowMs: number;
  cooldownUntil: number; 
}

@Injectable()
export class KeyPoolService {
  private snapshot = new Map<string, KeyState[]>();

  private localCursor = 0;

  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
    private readonly limiter: RedisRateLimiter,
  ) {}

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

    const candidates: KeyState[] = [];
    for (const k of all) {
      if (k.status !== ApiKeyStatus.ACTIVE) continue;
      if (k.cooldownUntil > now) continue;
      const w = Math.max(1, k.weight | 0);
      for (let i = 0; i < w; i++) candidates.push(k);
    }
    if (candidates.length === 0) {
      
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
    _retryAfterMs?: number,
  ): Promise<void> {
    const key = await this.repo.findOne({ where: { id: keyId } });
    if (!key) return;

    const update: Partial<ApiKey> = { lastError: message };

    if (kind === 'server' || kind === 'network') {
      update.failureCount = (key.failureCount ?? 0) + 1;
      this.dirtyFailureKeys.add(keyId);
    }

    await this.repo.update(keyId, update);
  }
}
