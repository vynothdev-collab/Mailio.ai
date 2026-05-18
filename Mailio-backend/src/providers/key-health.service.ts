import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { KeyPoolSync } from './key-pool.sync';

const HEALTH_LOCK_KEY = 'mailio:singleton:key-health';
const HEALTH_LOCK_TTL_SEC = 15;

@Injectable()
export class KeyHealthService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(KeyHealthService.name);
  private redis!: Redis;
  private timer?: NodeJS.Timeout;

  private readonly TICK_MS = parseInt(
    process.env.KEY_HEALTH_TICK_MS ?? '10000',
    10,
  );

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
    private readonly sync: KeyPoolSync,
  ) {}

  onApplicationBootstrap(): void {
    this.redis = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.redis.on('error', (e) =>
      this.logger.error(`redis error: ${e.message}`),
    );
    this.timer = setInterval(() => void this.tick(), this.TICK_MS);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  private async tick(): Promise<void> {
    const acquired = await this.redis.set(
      HEALTH_LOCK_KEY,
      process.pid.toString(),
      'EX',
      HEALTH_LOCK_TTL_SEC,
      'NX',
    );
    if (acquired !== 'OK') return; 

    try {
      const now = new Date();
      const expired = await this.repo.find({
        where: {
          status: ApiKeyStatus.COOLDOWN,
          cooldownUntil: LessThanOrEqual(now),
        },
        select: ['id', 'provider'],
      });
      if (expired.length === 0) return;

      await this.repo
        .createQueryBuilder()
        .update(ApiKey)
        .set({
          status: ApiKeyStatus.ACTIVE,
          cooldownUntil: null,
          failureCount: 0,
        })
        .whereInIds(expired.map((e) => e.id))
        .execute();

      this.logger.log(`Restored ${expired.length} key(s) from cooldown`);
      const providers = new Set(expired.map((e) => e.provider));
      for (const p of providers) {
        await this.sync.publish({ type: 'refresh', provider: p });
      }
    } catch (e) {
      this.logger.error(`tick failed: ${(e as Error).message}`);
    }
  }
}
