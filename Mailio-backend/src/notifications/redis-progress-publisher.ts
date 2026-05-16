import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  PROGRESS_CHANNEL,
  ProgressMessage,
  ProgressNotifier,
} from './progress-notifier';

/**
 * Worker-side notifier. Publishes a JSON event to Redis pub/sub instead of
 * touching socket.io directly. The API process runs RedisProgressSubscriber
 * which receives the event and re-emits it through the WebSocket gateway.
 *
 * Pub/sub is fire-and-forget: if no API process is currently subscribed the
 * event is dropped. That matches the gateway's own at-most-once semantics
 * and is intentional — UI clients reconcile on next snapshot read.
 */
@Injectable()
export class RedisProgressPublisher
  extends ProgressNotifier
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisProgressPublisher.name);
  private publisher!: Redis;

  constructor(private readonly config: ConfigService) {
    super();
  }

  onModuleInit(): void {
    this.publisher = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    this.publisher.on('error', (err) => {
      this.logger.error(`Redis publisher error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.publisher) await this.publisher.quit().catch(() => undefined);
  }

  private publish(msg: ProgressMessage): void {
    this.publisher
      .publish(PROGRESS_CHANNEL, JSON.stringify(msg))
      .catch((e) => this.logger.warn(`publish failed: ${(e as Error).message}`));
  }

  emitProgress(
    listId: string,
    payload: { listId: string; processed: number; total: number; pct: number },
  ): void {
    this.publish({ kind: 'progress', ...payload });
  }

  emitListStatusChange(listId: string, status: string): void {
    this.publish({ kind: 'list-status', listId, status });
  }

  emitSingleResult(userId: string, payload: Record<string, unknown>): void {
    this.publish({ kind: 'single-result', userId, payload });
  }

  emitJobFailed(roomId: string, payload: Record<string, unknown>): void {
    this.publish({ kind: 'job-failed', roomId, payload });
  }
}
