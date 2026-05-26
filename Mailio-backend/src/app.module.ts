import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import redisConfig from './config/redis.config';
import { DashboardModule } from './dashboard/dashboard.module';
import { DbWriteModule } from './db-write/db-write.module';
import { EmailListsModule } from './email-lists/email-lists.module';
import { EmailsModule } from './emails/emails.module';
import { LimiterModule } from './limiter/limiter.module';
import { MailTesterModule } from './mailtester/mailtester.module';
import { MetricsCollectorModule } from './metrics/metrics-collector.module';
import { MetricsModule } from './metrics/metrics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProvidersModule } from './providers/providers.module';
import { ResultsModule } from './results/results.module';
import { UsageModule } from './usage/usage.module';
import { UsersModule } from './users/users.module';
import { VerificationGatewayModule } from './verification/verification-gateway.module';
import { VerificationWorkerModule } from './verification/verification-worker.module';
import { VerificationModule } from './verification/verification.module';
import { VerifyModule } from './verify/verify.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig, mailConfig],
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
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 },
          attempts: parseInt(process.env.BULL_MAX_RETRIES ?? '3', 10),
          backoff: {
            type: 'exponential',
            delay: parseInt(process.env.BULL_BACKOFF_DELAY_MS ?? '5000', 10),
          },
        },
      }),
    }),
    AuthModule,
    UsersModule,
    EmailsModule,
    EmailListsModule,
    MailTesterModule,
    VerificationModule,
    VerifyModule,
    VerificationGatewayModule,
    VerificationWorkerModule,
    NotificationsModule.forRole('direct'),
    LimiterModule,
    ProvidersModule,
    DbWriteModule,
    MetricsModule,
    MetricsCollectorModule,
    DashboardModule,
    UsageModule,
    ResultsModule,
    AdminModule,
    AdminAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
