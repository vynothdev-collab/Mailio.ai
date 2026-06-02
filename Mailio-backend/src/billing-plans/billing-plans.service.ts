import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingPlan, BillingPlanType } from './entities/billing-plan.entity';
import { User } from '../users/entities/user.entity';
import { CreditsService } from '../credits/credits.service';
import {
  CreditTransaction,
  CreditAccountType,
} from '../credits/entities/credit-transaction.entity';

@Injectable()
export class BillingPlansService {
  constructor(
    @InjectRepository(BillingPlan)
    private readonly planRepo: Repository<BillingPlan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CreditTransaction)
    private readonly txRepo: Repository<CreditTransaction>,
    private readonly creditsService: CreditsService,
  ) {}

  async getActivePlans(userRole: string): Promise<BillingPlan[]> {
    const planType =
      userRole === 'ENTERPRISE_ADMIN'
        ? BillingPlanType.ENTERPRISE
        : BillingPlanType.USER;

    return this.planRepo.find({
      where: { isActive: true, planType },
      order: { sortOrder: 'ASC', price: 'ASC' },
    });
  }

  async activatePlan(
    user: User,
    planId: string,
  ): Promise<{ success: boolean; plan: BillingPlan; creditBalance: number }> {
    const plan = await this.planRepo.findOne({
      where: { id: planId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Plan not found or inactive');

    await this.creditsService.allocateToUser(
      user.id,
      plan.credits,
      user.id,
      `Plan activated: ${plan.name} (+${plan.credits} credits)`,
    );

    // Track which plan is currently active for this user
    await this.userRepo.update(user.id, { currentPlanId: plan.id });

    const updated = await this.userRepo.findOne({ where: { id: user.id } });

    return {
      success: true,
      plan,
      creditBalance: Number(updated?.creditBalance ?? 0),
    };
  }

  async getCreditHistory(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);

    const [rows, total] = await this.txRepo.findAndCount({
      where: { accountType: CreditAccountType.USER, accountId: userId },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      data: rows.map((r) => ({
        id: r.id,
        type: r.type,
        reason: r.reason,
        delta: Number(r.delta),
        balanceAfter: Number(r.balanceAfter),
        description: r.description,
        createdAt: r.createdAt,
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }
}
