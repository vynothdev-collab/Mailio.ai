import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  BillingPlan,
  BillingPlanType,
  PlanCategory,
} from './entities/billing-plan.entity';
import {
  ENTERPRISE_ROLES,
  User,
  UserRole,
} from '../users/entities/user.entity';
import {
  CreditTransaction,
  CreditAccountType,
} from '../credits/entities/credit-transaction.entity';
import {
  SubscriptionsService,
  CurrentSubscriptionDto,
} from '../subscriptions/subscriptions.service';

@Injectable()
export class BillingPlansService {
  constructor(
    @InjectRepository(BillingPlan)
    private readonly planRepo: Repository<BillingPlan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CreditTransaction)
    private readonly txRepo: Repository<CreditTransaction>,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /**
   * Return active plans visible to `userRole`.
   *   USER role           → USER or BOTH
   *   ENTERPRISE_ADMIN    → ENTERPRISE or BOTH
   */
  async getActivePlans(userRole: string): Promise<BillingPlan[]> {
    const isEnterpriseAdmin =
      userRole === (UserRole.ENTERPRISE_ADMIN as string);
    const targetTypes = isEnterpriseAdmin
      ? [BillingPlanType.ENTERPRISE, BillingPlanType.BOTH]
      : [BillingPlanType.USER, BillingPlanType.BOTH];

    return this.planRepo.find({
      where: {
        isActive: true,
        planType: In(targetTypes),
        deletedAt: IsNull(),
      },
      order: { sortOrder: 'ASC', price: 'ASC' },
    });
  }

  /**
   * BACKWARD-COMPATIBLE entry point retained for /billing/plans/:id/activate.
   * Internally routes to the new subscription system based on plan category.
   */
  async activatePlan(
    user: User,
    planId: string,
  ): Promise<{ success: boolean; plan: BillingPlan; creditBalance: number }> {
    const plan = await this.planRepo.findOne({
      where: { id: planId, isActive: true, deletedAt: IsNull() },
    });
    if (!plan) throw new NotFoundException('Plan not found or inactive');

    const isEnterpriseMember = ENTERPRISE_ROLES.includes(user.role);

    // Enterprise members → enterprise account.
    if (isEnterpriseMember) {
      if (!user.enterpriseId) {
        throw new BadRequestException('Enterprise account missing.');
      }
      if (plan.planCategory === PlanCategory.TOPUP) {
        await this.subscriptions.purchaseTopupForEnterprise(
          user.enterpriseId,
          plan.id,
        );
      } else {
        await this.subscriptions.purchaseValidityPlanForEnterprise(
          user.enterpriseId,
          plan.id,
        );
      }
      const refreshed = await this.dataSourceFetchEnterpriseBalance(
        user.enterpriseId,
      );
      return { success: true, plan, creditBalance: refreshed };
    }

    // Normal user.
    if (plan.planCategory === PlanCategory.TOPUP) {
      await this.subscriptions.purchaseTopupForUser(user.id, plan.id);
    } else {
      await this.subscriptions.purchaseValidityPlanForUser(user.id, plan.id);
    }
    const updated = await this.userRepo.findOne({ where: { id: user.id } });
    return {
      success: true,
      plan,
      creditBalance: Number(updated?.creditBalance ?? 0),
    };
  }

  /** Get the current/queued subscription view for the given user. */
  async getCurrentSubscription(user: User): Promise<CurrentSubscriptionDto> {
    if (ENTERPRISE_ROLES.includes(user.role) && user.enterpriseId) {
      return this.subscriptions.getCurrentSubscriptionForEnterprise(
        user.enterpriseId,
      );
    }
    return this.subscriptions.getCurrentSubscriptionForUser(user.id);
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
        subscriptionId: r.subscriptionId,
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async dataSourceFetchEnterpriseBalance(
    enterpriseId: string,
  ): Promise<number> {
    const row: { credit_balance: string }[] = await this.txRepo.manager.query(
      `SELECT credit_balance FROM enterprises WHERE id = $1`,
      [enterpriseId],
    );
    return row[0] ? Number(row[0].credit_balance) : 0;
  }
}
