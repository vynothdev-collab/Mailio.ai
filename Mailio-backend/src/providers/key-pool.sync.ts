import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { In, Not, Repository } from 'typeorm';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { KeyPoolService } from './key-pool.service';

export const KEY_POOL_EVENTS_CHANNEL = 'kp:events';

export type KeyPoolEvent =
  | { type: 'refresh'; provider?: string }
  | { type: 'added'; keyId: string }
  | { type: 'updated'; keyId: string }
  | { type: 'removed'; keyId: string };

@Injectable()
export class KeyPoolSync implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(KeyPoolSync.name);
  private subscriber!: Redis;
  private publisher!: Redis;
  private timer?: NodeJS.Timeout;

  private readonly REFRESH_INTERVAL_MS = parseInt(
    process.env.KEY_POOL_REFRESH_MS ?? '30000',
    10,
  );

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
    private readonly pool: KeyPoolService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const opts = {
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    this.subscriber = new Redis(opts);
    this.publisher = new Redis(opts);

    this.subscriber.on('error', (e) =>
      this.logger.error(`subscriber error: ${e.message}`),
    );
    this.publisher.on('error', (e) =>
      this.logger.error(`publisher error: ${e.message}`),
    );

    this.subscriber.on('message', (_ch, raw) => {
      let evt: KeyPoolEvent;
      try {
        evt = JSON.parse(raw) as KeyPoolEvent;
      } catch {
        return;
      }
      // For any event type, reload — simpler than diffing and the
      // snapshot is small. If a provider was named, only reload that one.
      const provider = evt.type === 'refresh' ? evt.provider : undefined;
      void this.reloadAll(provider);
    });
    await this.subscriber.subscribe(KEY_POOL_EVENTS_CHANNEL);

    await this.reloadAll();

    this.timer = setInterval(
      () => void this.reloadAll(),
      this.REFRESH_INTERVAL_MS,
    );
    this.logger.log('KeyPoolSync bootstrapped');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.subscriber) await this.subscriber.quit().catch(() => undefined);
    if (this.publisher) await this.publisher.quit().catch(() => undefined);
  }

  async reloadAll(provider?: string): Promise<void> {
    const where = provider
      ? { provider, status: Not(ApiKeyStatus.DISABLED) }
      : { status: Not(ApiKeyStatus.DISABLED) };
    const rows = await this.repo.find({ where });
    const byProvider = new Map<string, ApiKey[]>();
    for (const r of rows) {
      const list = byProvider.get(r.provider) ?? [];
      list.push(r);
      byProvider.set(r.provider, list);
    }

    // Deterministic order: oldest first so admin-added keys ride toward
    // the tail; the localCursor in KeyPoolService scrambles per-call.
    for (const [prov, list] of byProvider) {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      this.pool.setSnapshot(
        prov,
        list.map((r) => ({
          id: r.id,
          provider: r.provider,
          keyValue: r.keyValue,
          status: r.status,
          weight: r.weight,
          rlMax: r.rlMax,
          rlWindowMs: r.rlWindowMs,
          cooldownUntil: r.cooldownUntil ? r.cooldownUntil.getTime() : 0,
        })),
      );
    }

    // If a provider previously had keys but no longer does, clear it.
    if (!provider) {
      const allProviders = new Set(rows.map((r) => r.provider));
      for (const known of [...this.pool['snapshot'].keys()]) {
        if (!allProviders.has(known)) this.pool.setSnapshot(known, []);
      }
    }

    for (const [prov, list] of byProvider) {
      const active = list.filter(
        (r) => r.status === ApiKeyStatus.ACTIVE,
      ).length;
      const cooling = list.filter(
        (r) => r.status === ApiKeyStatus.COOLDOWN,
      ).length;
      this.logger.log(
        `Loaded ${list.length} key(s) for provider="${prov}" ` +
          `(active=${active}, cooldown=${cooling})`,
      );
    }
    if (byProvider.size === 0 && !provider) {
      this.logger.warn(
        'No api_keys rows loaded — verifications will be deferred ' +
          'until at least one key is added. Set MAILTESTER_API_KEY ' +
          'and restart, or POST to /admin/keys.',
      );
    }
  }

  /** Fan-out a cache-invalidation. Called by admin API + KeyHealthService. */
  async publish(evt: KeyPoolEvent): Promise<void> {
    if (!this.publisher) return;
    try {
      await this.publisher.publish(
        KEY_POOL_EVENTS_CHANNEL,
        JSON.stringify(evt),
      );
    } catch (e) {
      this.logger.warn(`publish failed: ${(e as Error).message}`);
    }
  }

  async countActive(
    provider: string,
    statuses?: ApiKeyStatus[],
  ): Promise<number> {
    return this.repo.count({
      where: {
        provider,
        ...(statuses ? { status: In(statuses) } : {}),
      },
    });
  }
}
