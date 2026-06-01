import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AdminActivityLogsModule } from './admin-activity-logs/admin-activity-logs.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminCreditsModule } from './admin-credits/admin-credits.module';
import { BillingPlansModule } from './billing-plans/billing-plans.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { AdminEnterprisesModule } from './admin-enterprises/admin-enterprises.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { DashboardModule } from './dashboard/dashboard.module';
import { CreditsModule } from './credits/credits.module';
import { EnterpriseScopeModule } from './enterprise-scope/enterprise-scope.module';
import { EnterprisesModule } from './enterprises/enterprises.module';
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
    EnterprisesModule,
    EnterpriseScopeModule,
    CreditsModule,
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
    AdminAuthModule,
    AdminDashboardModule,
    AdminActivityLogsModule,
    AdminUsersModule,
    AdminEnterprisesModule,
    AdminCreditsModule,
    BillingPlansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class ApiAppModule {}
