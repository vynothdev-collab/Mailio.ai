import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { DashboardModule } from './dashboard/dashboard.module';
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
import { VerificationModule } from './verification/verification.module';
import { VerifyModule } from './verify/verify.module';

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
    AuthModule,
    UsersModule,
    EmailsModule,
    EmailListsModule,
    MailTesterModule,
    VerificationModule,
    VerificationGatewayModule,
    NotificationsModule.forRole('subscriber'),
    LimiterModule,
    ProvidersModule,
    MetricsModule,
    MetricsCollectorModule,
    VerifyModule,
    DashboardModule,
    UsageModule,
    ResultsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class ApiAppModule {}
