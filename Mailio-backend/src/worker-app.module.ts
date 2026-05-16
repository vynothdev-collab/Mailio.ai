import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { CsvParseModule } from './csv-parse/csv-parse.module';
import { DbWriteModule } from './db-write/db-write.module';
import { DlqModule } from './dlq/dlq.module';
import { MetricsCollectorModule } from './metrics/metrics-collector.module';
import { MetricsModule } from './metrics/metrics.module';
import { EmailListsModule } from './email-lists/email-lists.module';
import { EmailsModule } from './emails/emails.module';
import { LimiterModule } from './limiter/limiter.module';
import { MailTesterModule } from './mailtester/mailtester.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProvidersModule } from './providers/providers.module';
import { VerificationWorkerModule } from './verification/verification-worker.module';
import { VerificationModule } from './verification/verification.module';

/**
 * Root module for the worker process (main.worker.ts).
 *
 * Loads BullMQ infrastructure, the @Processor, and its data dependencies —
 * but NOT the WebSocket gateway, controllers, or auth pipeline. Progress
 * events are published to Redis pub/sub and re-emitted by the API process.
 *
 * MUST run in PM2 `fork` mode (not `cluster`) so the BullMQ Worker doesn't
 * try to share connections across cluster children.
 *
 * The default global rate limiter is still per-process (Phase 1). Phase 2
 * replaces it with a Redis-backed global limiter, after which multiple
 * worker processes can run safely without exceeding provider limits.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database')!,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
        prefix: config.get<string>('redis.bullPrefix'),
      }),
    }),
    EmailsModule,
    EmailListsModule,
    MailTesterModule,
    VerificationModule,
    VerificationWorkerModule,
    NotificationsModule.forRole('publisher'),
    LimiterModule,
    ProvidersModule,
    DbWriteModule,
    CsvParseModule,
    DlqModule,
    MetricsModule,
    MetricsCollectorModule,
  ],
})
export class WorkerAppModule {}
