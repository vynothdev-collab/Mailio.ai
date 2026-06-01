import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsModule } from '../credits/credits.module';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import { User } from '../users/entities/user.entity';
import { AdminBillingPlansController } from './admin-billing-plans.controller';
import { AdminBillingPlansService } from './admin-billing-plans.service';
import { BillingPlansController } from './billing-plans.controller';
import { BillingPlansService } from './billing-plans.service';
import { BillingPlan } from './entities/billing-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingPlan, User, CreditTransaction]),
    CreditsModule,    // provides CreditsService + DataSource
  ],
  controllers: [AdminBillingPlansController, BillingPlansController],
  providers: [AdminBillingPlansService, BillingPlansService],
  exports: [BillingPlansService],
})
export class BillingPlansModule {}
