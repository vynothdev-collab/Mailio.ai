import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  BillingPlan,
  PlanCategory,
} from '../billing-plans/entities/billing-plan.entity';
import {
  CreditAccountType,
  CreditTransaction,
  CreditTransactionReason,
  CreditTransactionType,
} from '../credits/entities/credit-transaction.entity';
import {
  Subscription,
  SubscriptionAccountType,
  SubscriptionStatus,
} from './entities/subscription.entity';

export interface CurrentSubscriptionDto {
  activeBase: SubscriptionView | null;
  activeTopups: SubscriptionView[];
  queued: SubscriptionView[];
  totals: {
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
    expiresAt: Date | null;
  };
}

export interface SubscriptionView {
  id: string;
  planId: string;
  planName: string;
  planCategory: PlanCategory;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  parentSubscriptionId: string | null;
}

interface Target {
  type: SubscriptionAccountType;
  userId: string | null;
  enterpriseId: string | null;
}

/**
 * Mobile-recharge-style subscription manager.
 *
 *   Validity-based plans: queue if an active/queued plan already exists.
 *   Topup plans:          require an active base plan; inherit its expiry.
 *
 * The live `credit_balance` on users/enterprises stays in sync with the sum
 * of remaining_credits across all ACTIVE subscriptions for that account.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(BillingPlan)
    private readonly planRepo: Repository<BillingPlan>,
    @InjectRepository(CreditTransaction)
    private readonly txRepo: Repository<CreditTransaction>,
  ) {}

  // ─── Public purchase API ─────────────────────────────────────────────────

  async purchaseValidityPlanForUser(
    userId: string,
    planId: string,
  ): Promise<Subscription> {
    return this.purchaseValidity(
      { type: SubscriptionAccountType.USER, userId, enterpriseId: null },
      planId,
    );
  }

  async purchaseTopupForUser(
    userId: string,
    planId: string,
  ): Promise<Subscription> {
    return this.purchaseTopup(
      { type: SubscriptionAccountType.USER, userId, enterpriseId: null },
      planId,
    );
  }

  async purchaseValidityPlanForEnterprise(
    enterpriseId: string,
    planId: string,
  ): Promise<Subscription> {
    return this.purchaseValidity(
      { type: SubscriptionAccountType.ENTERPRISE, userId: null, enterpriseId },
      planId,
    );
  }

  async purchaseTopupForEnterprise(
    enterpriseId: string,
    planId: string,
  ): Promise<Subscription> {
    return this.purchaseTopup(
      { type: SubscriptionAccountType.ENTERPRISE, userId: null, enterpriseId },
      planId,
    );
  }

  // ─── Validity-based purchase ─────────────────────────────────────────────

  private async purchaseValidity(
    target: Target,
    planId: string,
  ): Promise<Subscription> {
    const plan = await this.loadPlan(planId);
    if (plan.planCategory !== PlanCategory.VALIDITY_BASED) {
      throw new BadRequestException(
        'This endpoint requires a VALIDITY_BASED plan.',
      );
    }
    const validityDays = plan.validityDays ?? 0;
    if (validityDays <= 0) {
      throw new BadRequestException(
        'Validity-based plan is missing validityDays.',
      );
    }

    return this.dataSource.transaction(async (em) => {
      await this.lockAccountRow(em, target);

      // Find the latest ACTIVE or QUEUED validity-based end date for this account.
      const latestEnd = await this.latestQueuedOrActiveEnd(em, target);

      let startDate: Date;
      let endDate: Date;
      let status: SubscriptionStatus;

      if (!latestEnd) {
        startDate = new Date();
        endDate = this.addDays(startDate, validityDays);
        status = SubscriptionStatus.ACTIVE;
      } else {
        startDate = new Date(latestEnd);
        endDate = this.addDays(startDate, validityDays);
        status = SubscriptionStatus.QUEUED;
      }

      const sub = em.create(Subscription, {
        accountType: target.type,
        userId: target.userId,
        enterpriseId: target.enterpriseId,
        planId: plan.id,
        planCategory: plan.planCategory,
        status,
        startDate,
        endDate,
        totalCredits: String(plan.credits),
        usedCredits: '0',
        remainingCredits: String(plan.credits),
        parentSubscriptionId: null,
      });
      const saved = await em.save(sub);

      // ACTIVE → credit the live balance + extend expiry now.
      // QUEUED → no live balance change until activation.
      if (status === SubscriptionStatus.ACTIVE) {
        await this.addToLiveBalance(em, target, plan.credits, endDate);
        await this.writeLedger(em, target, {
          type: CreditTransactionType.ALLOCATION,
          reason: CreditTransactionReason.PLAN_PURCHASE,
          delta: plan.credits,
          subscriptionId: saved.id,
          description: `Plan purchased: ${plan.name} (+${plan.credits} credits)`,
        });
      } else {
        // Ledger row so admins can see queued purchases.
        await this.writeLedgerNoBalance(em, target, {
          reason: CreditTransactionReason.PLAN_PURCHASE,
          subscriptionId: saved.id,
          description: `Plan queued: ${plan.name} starts ${startDate.toISOString().slice(0, 10)}`,
        });
      }

      this.logger.log(
        `Subscription ${saved.id} ${status} for ${target.type}=${target.userId ?? target.enterpriseId} ` +
          `(${plan.credits} credits, ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)})`,
      );
      return saved;
    });
  }

  // ─── Topup purchase ──────────────────────────────────────────────────────

  private async purchaseTopup(
    target: Target,
    planId: string,
  ): Promise<Subscription> {
    const plan = await this.loadPlan(planId);
    if (plan.planCategory !== PlanCategory.TOPUP) {
      throw new BadRequestException('This endpoint requires a TOPUP plan.');
    }

    return this.dataSource.transaction(async (em) => {
      await this.lockAccountRow(em, target);

      const parent = await this.findActiveBase(em, target);
      if (!parent) {
        throw new BadRequestException(
          'You need an active base plan before buying extra credits.',
        );
      }

      const sub = em.create(Subscription, {
        accountType: target.type,
        userId: target.userId,
        enterpriseId: target.enterpriseId,
        planId: plan.id,
        planCategory: plan.planCategory,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: parent.endDate, // inherit parent expiry
        totalCredits: String(plan.credits),
        usedCredits: '0',
        remainingCredits: String(plan.credits),
        parentSubscriptionId: parent.id,
      });
      const saved = await em.save(sub);

      // Add to live balance; do NOT extend expiry.
      await this.addToLiveBalance(em, target, plan.credits, null);
      await this.writeLedger(em, target, {
        type: CreditTransactionType.ALLOCATION,
        reason: CreditTransactionReason.TOPUP_PURCHASE,
        delta: plan.credits,
        subscriptionId: saved.id,
        description: `Top-up: ${plan.name} (+${plan.credits} credits, expires with active plan)`,
      });

      this.logger.log(
        `Topup ${saved.id} active for ${target.type}=${target.userId ?? target.enterpriseId} ` +
          `(parent=${parent.id}, +${plan.credits} credits)`,
      );
      return saved;
    });
  }

  // ─── Current subscription view ───────────────────────────────────────────

  async getCurrentSubscriptionForUser(
    userId: string,
  ): Promise<CurrentSubscriptionDto> {
    return this.getCurrentSubscription({
      type: SubscriptionAccountType.USER,
      userId,
      enterpriseId: null,
    });
  }

  async getCurrentSubscriptionForEnterprise(
    enterpriseId: string,
  ): Promise<CurrentSubscriptionDto> {
    return this.getCurrentSubscription({
      type: SubscriptionAccountType.ENTERPRISE,
      userId: null,
      enterpriseId,
    });
  }

  private async getCurrentSubscription(
    target: Target,
  ): Promise<CurrentSubscriptionDto> {
    const where: Record<string, unknown> = { accountType: target.type };
    if (target.type === SubscriptionAccountType.USER) {
      where.userId = target.userId;
    } else {
      where.enterpriseId = target.enterpriseId;
    }

    const all = await this.subRepo.find({
      where: {
        ...where,
        status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.QUEUED]),
      },
      order: { startDate: 'ASC' },
    });

    const planIds = Array.from(new Set(all.map((s) => s.planId)));
    const plans = planIds.length
      ? await this.planRepo.find({
          where: { id: In(planIds) },
          withDeleted: true,
        })
      : [];
    const planMap = new Map(plans.map((p) => [p.id, p]));

    const view = (s: Subscription): SubscriptionView => ({
      id: s.id,
      planId: s.planId,
      planName: planMap.get(s.planId)?.name ?? '—',
      planCategory: s.planCategory,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      totalCredits: Number(s.totalCredits),
      usedCredits: Number(s.usedCredits),
      remainingCredits: Number(s.remainingCredits),
      parentSubscriptionId: s.parentSubscriptionId,
    });

    const activeBase = all.find(
      (s) =>
        s.status === SubscriptionStatus.ACTIVE &&
        s.planCategory === PlanCategory.VALIDITY_BASED,
    );
    const activeTopups = all.filter(
      (s) =>
        s.status === SubscriptionStatus.ACTIVE &&
        s.planCategory === PlanCategory.TOPUP,
    );
    const queued = all.filter((s) => s.status === SubscriptionStatus.QUEUED);

    const activeAll = all.filter((s) => s.status === SubscriptionStatus.ACTIVE);
    const totals = {
      totalCredits: activeAll.reduce((s, x) => s + Number(x.totalCredits), 0),
      usedCredits: activeAll.reduce((s, x) => s + Number(x.usedCredits), 0),
      remainingCredits: activeAll.reduce(
        (s, x) => s + Number(x.remainingCredits),
        0,
      ),
      expiresAt: activeBase?.endDate ?? null,
    };

    return {
      activeBase: activeBase ? view(activeBase) : null,
      activeTopups: activeTopups.map(view),
      queued: queued.map(view),
      totals,
    };
  }

  // ─── Subscription-aware deduction tracking ───────────────────────────────

  /**
   * Reflect a credit deduction in subscription-level counters.
   *
   * IMPORTANT: pass the live-balance EntityManager so the subscription update
   * and the user/enterprise balance update commit atomically. If `em` is
   * omitted we open our own transaction (used by reconciliation jobs only).
   *
   * Deduction order is deterministic — same-expiry TOPUP credits are spent
   * before VALIDITY_BASED so users don't lose top-up credits to expiry, and
   * we tie-break on `created_at ASC` for full reproducibility.
   */
  async recordDeduction(
    accountType: CreditAccountType,
    accountId: string,
    amount: number,
    em?: EntityManager,
  ): Promise<void> {
    if (amount <= 0) return;
    if (em) {
      await this.recordDeductionInTx(em, accountType, accountId, amount);
      return;
    }
    await this.dataSource.transaction(async (innerEm) => {
      await this.recordDeductionInTx(innerEm, accountType, accountId, amount);
    });
  }

  private async recordDeductionInTx(
    em: EntityManager,
    accountType: CreditAccountType,
    accountId: string,
    amount: number,
  ): Promise<void> {
    const subAccountType =
      accountType === CreditAccountType.USER
        ? SubscriptionAccountType.USER
        : SubscriptionAccountType.ENTERPRISE;

    // Deterministic order:
    //   1) end_date ASC NULLS LAST     — credits about to expire are spent first
    //   2) plan_category TOPUP first   — when expiries are equal, drain top-ups
    //      so the user keeps their base-plan credits as long as possible
    //   3) created_at ASC              — final tie-break: oldest row first
    const candidates = await em
      .createQueryBuilder(Subscription, 's')
      .where(
        accountType === CreditAccountType.USER
          ? 's.user_id = :id AND s.account_type = :t'
          : 's.enterprise_id = :id AND s.account_type = :t',
        { id: accountId, t: subAccountType },
      )
      .andWhere('s.status = :st', { st: SubscriptionStatus.ACTIVE })
      .andWhere('s.remaining_credits > 0')
      .orderBy('s.end_date', 'ASC', 'NULLS LAST')
      .addOrderBy(
        `(CASE WHEN s.plan_category = '${PlanCategory.TOPUP}' THEN 0 ELSE 1 END)`,
        'ASC',
      )
      .addOrderBy('s.created_at', 'ASC')
      .setLock('pessimistic_write')
      .getMany();

    let remaining = amount;
    for (const sub of candidates) {
      if (remaining <= 0) break;
      const subRemaining = Number(sub.remainingCredits);
      const take = Math.min(remaining, subRemaining);
      await em.query(
        `UPDATE subscriptions
           SET used_credits      = used_credits + $1,
               remaining_credits = remaining_credits - $1,
               updated_at        = now()
         WHERE id = $2`,
        [take, sub.id],
      );
      remaining -= take;
    }

    if (remaining > 0) {
      // Subscription counters under-cover the live balance debit. This means
      // the user has live credits that aren't accounted for in subscriptions.
      // Throwing rolls back the live debit AND keeps invariants intact.
      throw new Error(
        `Cannot record deduction of ${amount} for ${accountType}=${accountId}: ` +
          `subscriptions cover only ${amount - remaining}. ` +
          `Run the reconcile job — live balance/subscription drift detected.`,
      );
    }
  }

  // ─── Expiry + queued activation (run by cron) ────────────────────────────

  /**
   * Process expired subscriptions and activate queued ones.
   * Returns counts for observability.
   */
  async expireAndActivateSubscriptions(): Promise<{
    expired: number;
    activated: number;
  }> {
    const now = new Date();

    const expiredRows = await this.subRepo
      .createQueryBuilder('s')
      .where('s.status = :st', { st: SubscriptionStatus.ACTIVE })
      .andWhere('s.end_date IS NOT NULL')
      .andWhere('s.end_date <= :now', { now })
      .getMany();

    let expired = 0;
    let activated = 0;

    // Group by account so we activate the queued plan for each affected account.
    const touchedAccounts = new Set<string>();

    for (const sub of expiredRows) {
      try {
        await this.dataSource.transaction(async (em) => {
          await this.expireSubscriptionTx(em, sub);
        });
        expired += 1;
        touchedAccounts.add(this.accountKey(sub));

        // Also expire all topups parented to this subscription (if it's the base).
        if (sub.planCategory === PlanCategory.VALIDITY_BASED) {
          const topups = await this.subRepo.find({
            where: {
              parentSubscriptionId: sub.id,
              status: SubscriptionStatus.ACTIVE,
            },
          });
          for (const topup of topups) {
            await this.dataSource.transaction(async (em) => {
              await this.expireSubscriptionTx(em, topup);
            });
            expired += 1;
          }
        }
      } catch (err) {
        this.logger.error(
          `Failed to expire subscription ${sub.id}: ${(err as Error).message}`,
        );
      }
    }

    // For every account that lost an ACTIVE base plan, try to activate the next queued one.
    for (const key of touchedAccounts) {
      try {
        const queued = await this.subRepo
          .createQueryBuilder('s')
          .where(this.accountKeyToWhere(key))
          .andWhere('s.status = :st', { st: SubscriptionStatus.QUEUED })
          .andWhere('s.plan_category = :c', { c: PlanCategory.VALIDITY_BASED })
          .orderBy('s.start_date', 'ASC')
          .getOne();
        if (!queued) continue;

        await this.dataSource.transaction(async (em) => {
          await this.activateQueuedTx(em, queued);
        });
        activated += 1;
      } catch (err) {
        this.logger.error(
          `Failed to activate queued for ${key}: ${(err as Error).message}`,
        );
      }
    }

    if (expired > 0 || activated > 0) {
      this.logger.log(
        `Expiry tick: expired=${expired}, activated=${activated} subscriptions.`,
      );
    }
    return { expired, activated };
  }

  // ─── Internal transactions ───────────────────────────────────────────────

  private async expireSubscriptionTx(
    em: EntityManager,
    sub: Subscription,
  ): Promise<void> {
    const remaining = Number(sub.remainingCredits);

    await em.query(
      `UPDATE subscriptions
         SET status            = $1,
             updated_at        = now()
       WHERE id = $2`,
      [SubscriptionStatus.EXPIRED, sub.id],
    );

    const target: Target = {
      type: sub.accountType,
      userId: sub.userId,
      enterpriseId: sub.enterpriseId,
    };

    if (remaining > 0) {
      // Remove the unused credits from the live balance.
      await this.addToLiveBalance(em, target, -remaining, null);
      await this.writeLedger(em, target, {
        type: CreditTransactionType.ADJUSTMENT,
        reason: CreditTransactionReason.SUBSCRIPTION_EXPIRY,
        delta: -remaining,
        subscriptionId: sub.id,
        description: `Subscription expired — removed ${remaining} unused credits`,
      });
    }

    // If we just expired the LAST active base plan with no queued replacement,
    // clear the live expiry timestamp so the account is not flagged active.
    if (sub.planCategory === PlanCategory.VALIDITY_BASED) {
      const remainingActive = await em.count(Subscription, {
        where: {
          ...(sub.accountType === SubscriptionAccountType.USER
            ? { userId: sub.userId! }
            : { enterpriseId: sub.enterpriseId! }),
          status: SubscriptionStatus.ACTIVE,
          planCategory: PlanCategory.VALIDITY_BASED,
        },
      });
      if (remainingActive === 0) {
        await this.setLiveExpiry(em, target, null);
      }
    }
  }

  private async activateQueuedTx(
    em: EntityManager,
    sub: Subscription,
  ): Promise<void> {
    // The queued row already has start_date / end_date computed at purchase time.
    // We honour them but bump start_date to now if the user is past the originally
    // scheduled start (e.g. expiry ran late).
    const now = new Date();
    let startDate = sub.startDate;
    let endDate = sub.endDate;

    if (startDate < now) {
      const validityMs = endDate ? endDate.getTime() - startDate.getTime() : 0;
      startDate = now;
      endDate = validityMs > 0 ? new Date(now.getTime() + validityMs) : endDate;
    }

    await em.query(
      `UPDATE subscriptions
         SET status     = $1,
             start_date = $2,
             end_date   = $3,
             updated_at = now()
       WHERE id = $4`,
      [SubscriptionStatus.ACTIVE, startDate, endDate, sub.id],
    );

    const target: Target = {
      type: sub.accountType,
      userId: sub.userId,
      enterpriseId: sub.enterpriseId,
    };
    const credits = Number(sub.remainingCredits);

    await this.addToLiveBalance(em, target, credits, endDate);
    await this.writeLedger(em, target, {
      type: CreditTransactionType.ALLOCATION,
      reason: CreditTransactionReason.PLAN_ACTIVATED,
      delta: credits,
      subscriptionId: sub.id,
      description: `Queued plan activated (+${credits} credits)`,
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async loadPlan(planId: string): Promise<BillingPlan> {
    const plan = await this.planRepo.findOne({
      where: { id: planId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Plan not found or inactive.');
    return plan;
  }

  private async lockAccountRow(
    em: EntityManager,
    target: Target,
  ): Promise<void> {
    const table =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? 'enterprises'
        : 'users';
    const id =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? target.enterpriseId!
        : target.userId!;
    const rows: { id: string }[] = await em.query(
      `SELECT id FROM "${table}" WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`${target.type} ${id} not found.`);
    }
  }

  private async latestQueuedOrActiveEnd(
    em: EntityManager,
    target: Target,
  ): Promise<Date | null> {
    const rows: { end_date: Date | null }[] = await em.query(
      `SELECT end_date FROM subscriptions
        WHERE account_type = $1
          AND ${target.type === SubscriptionAccountType.USER ? 'user_id' : 'enterprise_id'} = $2
          AND plan_category = $3
          AND status IN ($4, $5)
        ORDER BY end_date DESC NULLS LAST
        LIMIT 1`,
      [
        target.type,
        target.userId ?? target.enterpriseId,
        PlanCategory.VALIDITY_BASED,
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.QUEUED,
      ],
    );
    return rows[0]?.end_date ? new Date(rows[0].end_date) : null;
  }

  private async findActiveBase(
    em: EntityManager,
    target: Target,
  ): Promise<Subscription | null> {
    const idCol =
      target.type === SubscriptionAccountType.USER ? 'userId' : 'enterpriseId';
    const id =
      target.type === SubscriptionAccountType.USER
        ? target.userId
        : target.enterpriseId;
    return em.findOne(Subscription, {
      where: {
        accountType: target.type,
        [idCol]: id,
        planCategory: PlanCategory.VALIDITY_BASED,
        status: SubscriptionStatus.ACTIVE,
      },
      order: { endDate: 'DESC' },
    });
  }

  private async addToLiveBalance(
    em: EntityManager,
    target: Target,
    delta: number,
    extendExpiryTo: Date | null,
  ): Promise<void> {
    const table =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? 'enterprises'
        : 'users';
    const id =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? target.enterpriseId!
        : target.userId!;

    if (extendExpiryTo) {
      if (target.type === SubscriptionAccountType.ENTERPRISE) {
        await em.query(
          `UPDATE enterprises
             SET credit_balance          = GREATEST(0, credit_balance + $1),
                 total_purchased_credits = total_purchased_credits + GREATEST(0, $1),
                 credit_expires_at       = $2,
                 updated_at              = now()
           WHERE id = $3`,
          [delta, extendExpiryTo, id],
        );
      } else {
        await em.query(
          `UPDATE users
             SET credit_balance    = GREATEST(0, credit_balance + $1),
                 credit_expires_at = $2,
                 updated_at        = now()
           WHERE id = $3`,
          [delta, extendExpiryTo, id],
        );
      }
    } else {
      if (target.type === SubscriptionAccountType.ENTERPRISE) {
        await em.query(
          `UPDATE enterprises
             SET credit_balance          = GREATEST(0, credit_balance + $1),
                 total_purchased_credits = total_purchased_credits + GREATEST(0, $1),
                 updated_at              = now()
           WHERE id = $2`,
          [delta, id],
        );
      } else {
        await em.query(
          `UPDATE "${table}"
             SET credit_balance = GREATEST(0, credit_balance + $1),
                 updated_at     = now()
           WHERE id = $2`,
          [delta, id],
        );
      }
    }
  }

  private async setLiveExpiry(
    em: EntityManager,
    target: Target,
    value: Date | null,
  ): Promise<void> {
    const table =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? 'enterprises'
        : 'users';
    const id =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? target.enterpriseId!
        : target.userId!;
    await em.query(
      `UPDATE "${table}" SET credit_expires_at = $1, updated_at = now() WHERE id = $2`,
      [value, id],
    );
  }

  private async writeLedger(
    em: EntityManager,
    target: Target,
    opts: {
      type: CreditTransactionType;
      reason: CreditTransactionReason;
      delta: number;
      subscriptionId: string;
      description: string;
    },
  ): Promise<void> {
    const accountType =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? CreditAccountType.ENTERPRISE
        : CreditAccountType.USER;
    const accountId =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? target.enterpriseId!
        : target.userId!;

    // Read the current live balance for the ledger's balance_after column.
    const table =
      accountType === CreditAccountType.ENTERPRISE ? 'enterprises' : 'users';
    const rows: { credit_balance: string }[] = await em.query(
      `SELECT credit_balance FROM "${table}" WHERE id = $1`,
      [accountId],
    );
    const balanceAfter = rows[0] ? Number(rows[0].credit_balance) : 0;

    const tx = em.create(CreditTransaction, {
      accountType,
      accountId,
      userId: accountType === CreditAccountType.USER ? accountId : null,
      enterpriseId:
        accountType === CreditAccountType.ENTERPRISE ? accountId : null,
      type: opts.type,
      reason: opts.reason,
      delta: String(opts.delta),
      balanceAfter: String(balanceAfter),
      referenceType: 'subscription',
      referenceId: opts.subscriptionId,
      subscriptionId: opts.subscriptionId,
      description: opts.description,
      createdByAdminId: null,
      createdByUserId: null,
    });
    await em.save(tx);
  }

  /** Ledger entry that does NOT debit/credit live balance (e.g. queued purchase). */
  private async writeLedgerNoBalance(
    em: EntityManager,
    target: Target,
    opts: {
      reason: CreditTransactionReason;
      subscriptionId: string;
      description: string;
    },
  ): Promise<void> {
    const accountType =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? CreditAccountType.ENTERPRISE
        : CreditAccountType.USER;
    const accountId =
      target.type === SubscriptionAccountType.ENTERPRISE
        ? target.enterpriseId!
        : target.userId!;

    const table =
      accountType === CreditAccountType.ENTERPRISE ? 'enterprises' : 'users';
    const rows: { credit_balance: string }[] = await em.query(
      `SELECT credit_balance FROM "${table}" WHERE id = $1`,
      [accountId],
    );
    const balanceAfter = rows[0] ? Number(rows[0].credit_balance) : 0;

    const tx = em.create(CreditTransaction, {
      accountType,
      accountId,
      userId: accountType === CreditAccountType.USER ? accountId : null,
      enterpriseId:
        accountType === CreditAccountType.ENTERPRISE ? accountId : null,
      type: CreditTransactionType.ADJUSTMENT,
      reason: opts.reason,
      delta: '0',
      balanceAfter: String(balanceAfter),
      referenceType: 'subscription',
      referenceId: opts.subscriptionId,
      subscriptionId: opts.subscriptionId,
      description: opts.description,
      createdByAdminId: null,
      createdByUserId: null,
    });
    await em.save(tx);
  }

  private accountKey(sub: Subscription): string {
    return sub.accountType === SubscriptionAccountType.USER
      ? `U:${sub.userId}`
      : `E:${sub.enterpriseId}`;
  }

  private accountKeyToWhere(key: string): string {
    const [t, id] = key.split(':');
    return t === 'U'
      ? `s.user_id = '${id}' AND s.account_type = '${SubscriptionAccountType.USER}'`
      : `s.enterprise_id = '${id}' AND s.account_type = '${SubscriptionAccountType.ENTERPRISE}'`;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  // Reference to silence "unused" hints in some configs.
}
