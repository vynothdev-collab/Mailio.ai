import {
  Injectable,
  Logger,
  Optional,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { MetricsService } from '../metrics/metrics.service';
import { TOKEN_BUCKET_LUA } from './token-bucket.lua';

export interface AcquireResult {
  granted: boolean;
  /** Milliseconds the caller should wait before retrying. 0 if granted. */
  retryAfterMs: number;
}

export interface AcquireOptions {
  max: number;
  windowMs: number;
  cost?: number;
}

/**
 * Global, distributed token-bucket rate limiter backed by a single Redis
 * EVAL. Replaces the per-process `nextSlotAt` pacer and the BullMQ Worker
 * `limiter` option, both of which can only enforce limits within a single
 * Node process.
 *
 * Usage from a BullMQ processor:
 *
 *   const r = await limiter.acquire('mailtester', { max: 57, windowMs: 10000 });
 *   if (!r.granted) {
 *     await worker.rateLimit(r.retryAfterMs);
 *     throw new (await import('bullmq')).RateLimitError();
 *   }
 *   // proceed to call the third-party API
 *
 * The (max, windowMs) pair is passed per call so callers (KeyPool in
 * Phase 3) can change limits at runtime without restart.
 */
@Injectable()
export class RedisRateLimiter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisRateLimiter.name);
  private redis!: Redis;
  private scriptSha: string | null = null;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  onModuleInit(): void {
    this.redis = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    this.redis.on('error', (err) => {
      this.logger.error(`Redis limiter error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  /**
   * Atomically attempt to consume `cost` tokens from the named bucket.
   * The bucket holds `max` tokens and refills linearly over `windowMs`.
   *
   * @param key short name; the actual Redis key is `rl:{key}` so the
   *            caller doesn't have to construct it.
   */
  async acquire(key: string, opts: AcquireOptions): Promise<AcquireResult> {
    const cost = opts.cost ?? 1;
    const fullKey = `rl:${key}`;
    const args: (string | number)[] = [
      opts.max,
      opts.windowMs,
      Date.now(),
      cost,
    ];

    let raw: [number, number];
    try {
      if (this.scriptSha) {
        raw = (await this.redis.evalsha(
          this.scriptSha,
          1,
          fullKey,
          ...(args as any),
        )) as [number, number];
      } else {
        raw = (await this.evalAndCache(fullKey, args)) as [number, number];
      }
    } catch (e) {
      // NOSCRIPT — Redis flushed scripts (e.g. after a failover). Re-load.
      if ((e as Error).message.includes('NOSCRIPT')) {
        this.scriptSha = null;
        raw = (await this.evalAndCache(fullKey, args)) as [number, number];
      } else {
        throw e;
      }
    }

    const granted = raw[0] === 1;
    if (this.metrics) {
      this.metrics.limiterAcquires
        .labels({ key, granted: String(granted) })
        .inc();
      if (!granted) {
        this.metrics.limiterRetryAfter.labels({ key }).observe(raw[1]);
      }
    }
    return { granted, retryAfterMs: raw[1] };
  }

  private async evalAndCache(
    fullKey: string,
    args: (string | number)[],
  ): Promise<[number, number]> {
    const result = (await this.redis.eval(
      TOKEN_BUCKET_LUA,
      1,
      fullKey,
      ...(args as any),
    )) as [number, number];
    // Cache the SHA for subsequent calls (much faster than re-sending the
    // script body each time).
    try {
      this.scriptSha = (await this.redis.script(
        'LOAD',
        TOKEN_BUCKET_LUA,
      )) as string;
    } catch (e) {
      this.logger.warn(`SCRIPT LOAD failed: ${(e as Error).message}`);
    }
    return result;
  }
}
