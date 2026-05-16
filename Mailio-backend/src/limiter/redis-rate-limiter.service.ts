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
        raw = await this.evalAndCache(fullKey, args);
      }
    } catch (e) {
      // NOSCRIPT — Redis flushed scripts (e.g. after a failover). Re-load.
      if ((e as Error).message.includes('NOSCRIPT')) {
        this.scriptSha = null;
        raw = await this.evalAndCache(fullKey, args);
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
