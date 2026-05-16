import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { VerificationGateway } from '../verification/verification.gateway';
import {
  PROGRESS_CHANNEL,
  ProgressMessage,
} from './progress-notifier';

/**
 * API-process bridge. Subscribes to the Redis pub/sub channel that workers
 * publish to, and forwards each message into the WebSocket gateway so that
 * connected browsers see real-time progress regardless of which worker
 * container produced the event.
 *
 * Owns its own ioredis connection (subscriber connections cannot be shared
 * with the BullMQ connection — Redis puts them in subscribed mode).
 */
@Injectable()
export class RedisProgressSubscriber
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisProgressSubscriber.name);
  private subscriber!: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: VerificationGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriber = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.subscriber.on('error', (err) => {
      this.logger.error(`Redis subscriber error: ${err.message}`);
    });
    this.subscriber.on('message', (_channel, raw) => this.dispatch(raw));
    await this.subscriber.subscribe(PROGRESS_CHANNEL);
    this.logger.log(`Subscribed to ${PROGRESS_CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) await this.subscriber.quit().catch(() => undefined);
  }

  private dispatch(raw: string): void {
    let msg: ProgressMessage;
    try {
      msg = JSON.parse(raw) as ProgressMessage;
    } catch (e) {
      this.logger.warn(`Invalid progress message: ${(e as Error).message}`);
      return;
    }

    try {
      switch (msg.kind) {
        case 'progress':
          this.gateway.emitProgress(msg.listId, {
            listId: msg.listId,
            processed: msg.processed,
            total: msg.total,
            pct: msg.pct,
          });
          break;
        case 'list-status':
          this.gateway.emitListStatusChange(msg.listId, msg.status);
          break;
        case 'single-result':
          this.gateway.emitSingleResult(msg.userId, msg.payload);
          break;
        case 'job-failed':
          this.gateway.emitJobFailed(msg.roomId, msg.payload);
          break;
      }
    } catch (e) {
      this.logger.warn(`Gateway forward failed: ${(e as Error).message}`);
    }
  }
}
