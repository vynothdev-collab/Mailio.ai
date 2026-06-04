import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { User } from '../users/entities/user.entity';
import { BillingPlan } from '../billing-plans/entities/billing-plan.entity';
import { CreditsModule } from '../credits/credits.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EnterpriseCreditsService } from './enterprise-credits.service';
import { EnterpriseCreditsController } from './enterprise-credits.controller';
import { CreditExpiryService } from './credit-expiry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enterprise, User, BillingPlan]),
    CreditsModule,
    SubscriptionsModule,
  ],
  providers: [EnterpriseCreditsService, CreditExpiryService],
  controllers: [EnterpriseCreditsController],
  exports: [EnterpriseCreditsService],
})
export class EnterpriseCreditsModule {}
