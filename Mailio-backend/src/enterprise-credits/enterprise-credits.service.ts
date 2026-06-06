import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  BillingPlan,
  PlanCategory,
} from '../billing-plans/entities/billing-plan.entity';
import { CreditsService } from '../credits/credits.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface UserCreditRow {
  id: string;
  name: string;
  email: string;
  allocated: number;
  used: number;
  remaining: number;
  expiresAt: Date | null;
}

export interface EnterpriseCreditSummary {
  totalPurchased: number;
  enterprisePool: number;
  totalAllocated: number;
  totalUsed: number;
  adminUsable: number;
  expiresAt: Date | null;
  daysRemaining: number | null;
  users: UserCreditRow[];
}

@Injectable()
export class EnterpriseCreditsService {
  private readonly logger = new Logger(EnterpriseCreditsService.name);

  constructor(
    @InjectRepository(Enterprise)
    private readonly enterpriseRepo: Repository<Enterprise>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BillingPlan)
    private readonly planRepo: Repository<BillingPlan>,
    private readonly dataSource: DataSource,
    private readonly creditsService: CreditsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async getCreditSummary(
    enterpriseId: string,
  ): Promise<EnterpriseCreditSummary> {
    const enterprise = await this.enterpriseRepo.findOne({
      where: { id: enterpriseId, deletedAt: IsNull() },
    });
    if (!enterprise) throw new NotFoundException('Enterprise not found.');

    const users = await this.userRepo.find({
      where: { enterpriseId, role: UserRole.ENTERPRISE_USER },
      order: { name: 'ASC' },
      take: 500,
    });

    const totalAllocated = users.reduce(
      (s, u) => s + Number(u.creditLimit ?? 0),
      0,
    );
    const totalUsed = users.reduce((s, u) => s + Number(u.creditsUsed ?? 0), 0);
    const enterprisePool = Number(enterprise.creditBalance);

    const daysRemaining = enterprise.creditExpiresAt
      ? Math.max(
          0,
          Math.ceil(
            (enterprise.creditExpiresAt.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

    return {
      totalPurchased: Number(enterprise.totalPurchasedCredits),
      enterprisePool,
      totalAllocated,
      totalUsed,
      adminUsable: Math.max(0, enterprisePool - totalAllocated),
      expiresAt: enterprise.creditExpiresAt,
      daysRemaining,
      users: users.map((u) => {
        const allocated = Number(u.creditLimit ?? 0);
        const used = Number(u.creditsUsed ?? 0);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          allocated,
          used,
          remaining: Math.max(0, allocated - used),
          expiresAt: u.creditExpiresAt ?? enterprise.creditExpiresAt,
        };
      }),
    };
  }

  async allocateToUser(
    enterpriseId: string,
    targetUserId: string,
    amount: number,
    actorId: string,
  ): Promise<void> {
    const [enterprise, user] = await Promise.all([
      this.enterpriseRepo.findOne({
        where: { id: enterpriseId, deletedAt: IsNull() },
      }),
      this.userRepo.findOne({
        where: {
          id: targetUserId,
          enterpriseId,
          role: UserRole.ENTERPRISE_USER,
        },
      }),
    ]);

    if (!enterprise) throw new NotFoundException('Enterprise not found.');
    if (!user) throw new NotFoundException('Enterprise user not found.');

    const userUsed = Number(user.creditsUsed ?? 0);
    if (amount < userUsed) {
      throw new BadRequestException(
        `Cannot reduce allocation below ${userUsed} credits — this user has already used ${userUsed} credits.`,
      );
    }

    const otherAllocated = await this.sumOtherAllocations(
      enterpriseId,
      targetUserId,
    );
    const enterprisePool = Number(enterprise.creditBalance);

    const available = enterprisePool - otherAllocated;
    if (amount > available) {
      throw new BadRequestException(
        `Insufficient credits. You have ${available} credits available to allocate.`,
      );
    }

    await this.userRepo.update(targetUserId, {
      creditLimit: String(amount),
      creditExpiresAt: enterprise.creditExpiresAt ?? undefined,
    });

    this.logger.log(
      `Enterprise ${enterpriseId}: user ${targetUserId} credit limit set to ${amount} by actor ${actorId}`,
    );
  }

  async purchasePlan(
    enterprise: Enterprise,
    plan: BillingPlan,
    actorId: string,
  ): Promise<{
    needsReallocation: boolean;
    creditBalance: number;
    expiresAt: Date;
    users?: Array<{
      id: string;
      name: string;
      email: string;
      previousAllocation: number;
      used: number;
    }>;
  }> {
    void actorId;

    if (plan.planCategory === PlanCategory.TOPUP) {
      const sub = await this.subscriptions.purchaseTopupForEnterprise(
        enterprise.id,
        plan.id,
      );
      const fresh = await this.enterpriseRepo.findOne({
        where: { id: enterprise.id },
      });
      return {
        needsReallocation: false,
        creditBalance: Number(fresh?.creditBalance ?? 0),
        expiresAt: sub.endDate ?? new Date(),
      };
    }

    const now = new Date();
    const hasActiveExpiry =
      enterprise.creditExpiresAt !== null && enterprise.creditExpiresAt > now;

    const enterpriseUsers = await this.userRepo.find({
      where: { enterpriseId: enterprise.id, role: UserRole.ENTERPRISE_USER },
      order: { name: 'ASC' },
    });

    if (!hasActiveExpiry && enterpriseUsers.length > 0) {
      const validityDays = plan.validityDays ?? 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validityDays);
      return {
        needsReallocation: true,
        creditBalance: plan.credits,
        expiresAt,
        users: enterpriseUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          previousAllocation: Number(u.creditLimit ?? 0),
          used: Number(u.creditsUsed ?? 0),
        })),
      };
    }

    const sub = await this.subscriptions.purchaseValidityPlanForEnterprise(
      enterprise.id,
      plan.id,
    );
    const fresh = await this.enterpriseRepo.findOne({
      where: { id: enterprise.id },
    });
    return {
      needsReallocation: false,
      creditBalance: Number(fresh?.creditBalance ?? 0),
      expiresAt: sub.endDate ?? new Date(),
    };
  }

  async confirmReallocation(
    enterpriseId: string,
    planId: string,
    allocations: Array<{ userId: string; amount: number }>,
    actorId: string,
  ): Promise<{ creditBalance: number; expiresAt: Date }> {
    void actorId;
    const [enterprise, plan] = await Promise.all([
      this.enterpriseRepo.findOne({
        where: { id: enterpriseId, deletedAt: IsNull() },
      }),
      this.planRepo.findOne({ where: { id: planId, isActive: true } }),
    ]);
    if (!enterprise) throw new NotFoundException('Enterprise not found.');
    if (!plan) throw new NotFoundException('Plan not found or inactive.');

    const totalRequested = allocations.reduce((s, a) => s + a.amount, 0);
    if (totalRequested > plan.credits) {
      throw new BadRequestException(
        `Total allocations (${totalRequested}) exceed plan credits (${plan.credits}).`,
      );
    }

    const userIds = allocations.map((a) => a.userId);
    const users = await this.userRepo.find({
      where: userIds.map((id) => ({ id, enterpriseId })),
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const alloc of allocations) {
      const u = userMap.get(alloc.userId);
      if (!u) continue;
      const used = Number(u.creditsUsed ?? 0);
      if (alloc.amount < used) {
        throw new BadRequestException(
          `Cannot reduce ${u.name}'s allocation below ${used} — they have already used ${used} credits.`,
        );
      }
    }

    const validityDays = plan.validityDays ?? 30;
    const tentativeExpiry = new Date();
    tentativeExpiry.setDate(tentativeExpiry.getDate() + validityDays);

    const enterpriseUsers = await this.userRepo.find({
      where: { enterpriseId, role: UserRole.ENTERPRISE_USER },
    });
    await this.applyUserAllocations(
      enterpriseId,
      tentativeExpiry,
      enterpriseUsers,
      allocations,
    );

    const sub = await this.subscriptions.purchaseValidityPlanForEnterprise(
      enterpriseId,
      planId,
    );

    if (sub.endDate && sub.endDate.getTime() !== tentativeExpiry.getTime()) {
      await this.dataSource.query(
        `UPDATE users
           SET credit_expires_at = $1, updated_at = now()
         WHERE enterprise_id = $2
           AND role IN ('ENTERPRISE_USER', 'ENTERPRISE_ADMIN')`,
        [sub.endDate, enterpriseId],
      );
    }

    const fresh = await this.enterpriseRepo.findOne({
      where: { id: enterpriseId },
    });
    return {
      creditBalance: Number(fresh?.creditBalance ?? plan.credits),
      expiresAt: sub.endDate ?? tentativeExpiry,
    };
  }

  async processExpiredCredits(): Promise<void> {
    const now = new Date();

    const expired = await this.enterpriseRepo
      .createQueryBuilder('e')
      .where('e.credit_expires_at IS NOT NULL')
      .andWhere('e.credit_expires_at <= :now', { now })
      .andWhere('e.deleted_at IS NULL')
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.enterprise_id = e.id)`,
      )
      .getMany();

    for (const enterprise of expired) {
      try {
        await this.dataSource.transaction(async (em) => {
          await em.query(
            `UPDATE enterprises
               SET credit_balance            = 0,
                   credits_used              = 0,
                   total_purchased_credits   = 0,
                   credit_expires_at         = NULL,
                   updated_at                = now()
             WHERE id = $1`,
            [enterprise.id],
          );

          await em.query(
            `UPDATE users
               SET credit_limit       = NULL,
                   credits_used       = 0,
                   credit_expires_at  = NULL,
                   updated_at         = now()
             WHERE enterprise_id = $1
               AND role IN ('ENTERPRISE_USER', 'ENTERPRISE_ADMIN')`,
            [enterprise.id],
          );
        });

        this.logger.log(
          `Credit expiry processed for enterprise ${enterprise.id} (${enterprise.name})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to process credit expiry for enterprise ${enterprise.id}: ${(err as Error).message}`,
        );
      }
    }

    if (expired.length > 0) {
      this.logger.log(
        `Credit expiry job: reset ${expired.length} enterprise(s).`,
      );
    }
  }

  private async applyStackedRenewal(
    enterpriseId: string,
    newBalance: number,
    expiresAt: Date,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      await em.query(
        `UPDATE enterprises
           SET credit_balance          = $1,
               total_purchased_credits = total_purchased_credits + $1,
               credits_used            = 0,
               credit_expires_at       = $2,
               updated_at              = now()
         WHERE id = $3`,
        [newBalance, expiresAt, enterpriseId],
      );

      await em.query(
        `UPDATE users
           SET credits_used      = 0,
               credit_expires_at = $1,
               updated_at        = now()
         WHERE enterprise_id = $2
           AND role IN ('ENTERPRISE_USER', 'ENTERPRISE_ADMIN')`,
        [expiresAt, enterpriseId],
      );
    });
  }

  private async sumOtherAllocations(
    enterpriseId: string,
    excludeUserId: string,
  ): Promise<number> {
    const row = await this.dataSource.query<{ total: string }[]>(
      `SELECT COALESCE(SUM(credit_limit), 0) AS total
         FROM users
        WHERE enterprise_id = $1
          AND role = 'ENTERPRISE_USER'
          AND credit_limit IS NOT NULL
          AND id != $2`,
      [enterpriseId, excludeUserId],
    );
    return Number(row[0]?.total ?? 0);
  }

  private async applyUserAllocations(
    enterpriseId: string,
    expiresAt: Date,
    enterpriseUsers: User[],
    allocations: Array<{ userId: string; amount: number }>,
  ): Promise<void> {
    const allocMap = new Map(allocations.map((a) => [a.userId, a.amount]));
    await this.dataSource.transaction(async (em) => {
      for (const user of enterpriseUsers) {
        const newLimit = allocMap.has(user.id) ? allocMap.get(user.id) : null;
        await em.query(
          `UPDATE users
             SET credit_limit      = $1,
                 credits_used      = 0,
                 credit_expires_at = $2,
                 updated_at        = now()
           WHERE id = $3`,
          [
            newLimit !== undefined && newLimit !== null
              ? String(newLimit)
              : null,
            expiresAt,
            user.id,
          ],
        );
      }

      await em.query(
        `UPDATE users
           SET credit_expires_at = $1,
               credits_used      = 0,
               updated_at        = now()
         WHERE enterprise_id = $2 AND role = 'ENTERPRISE_ADMIN'`,
        [expiresAt, enterpriseId],
      );
    });
  }

  private async applyRenewal(
    enterpriseId: string,
    credits: number,
    expiresAt: Date,
    enterpriseUsers: User[],
    keepExistingLimits: boolean,
    allocations?: Array<{ userId: string; amount: number }>,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      await em.query(
        `UPDATE enterprises
           SET credit_balance          = $1,
               total_purchased_credits = $1,
               credits_used            = 0,
               credit_expires_at       = $2,
               updated_at              = now()
         WHERE id = $3`,
        [credits, expiresAt, enterpriseId],
      );

      if (keepExistingLimits) {
        await em.query(
          `UPDATE users
             SET credits_used      = 0,
                 credit_expires_at = $1,
                 updated_at        = now()
           WHERE enterprise_id = $2
             AND role IN ('ENTERPRISE_USER', 'ENTERPRISE_ADMIN')`,
          [expiresAt, enterpriseId],
        );
      } else if (allocations && allocations.length > 0) {
        const allocMap = new Map(allocations.map((a) => [a.userId, a.amount]));
        for (const user of enterpriseUsers) {
          const newLimit = allocMap.has(user.id) ? allocMap.get(user.id) : null;
          await em.query(
            `UPDATE users
               SET credit_limit      = $1,
                   credits_used      = 0,
                   credit_expires_at = $2,
                   updated_at        = now()
             WHERE id = $3`,
            [
              newLimit !== undefined && newLimit !== null
                ? String(newLimit)
                : null,
              expiresAt,
              user.id,
            ],
          );
        }

        await em.query(
          `UPDATE users
             SET credit_expires_at = $1,
                 credits_used      = 0,
                 updated_at        = now()
           WHERE enterprise_id = $2 AND role = 'ENTERPRISE_ADMIN'`,
          [expiresAt, enterpriseId],
        );
      } else {
        await em.query(
          `UPDATE users
             SET credit_limit      = NULL,
                 credits_used      = 0,
                 credit_expires_at = $1,
                 updated_at        = now()
           WHERE enterprise_id = $2
             AND role IN ('ENTERPRISE_USER', 'ENTERPRISE_ADMIN')`,
          [expiresAt, enterpriseId],
        );
      }
    });
  }
}
