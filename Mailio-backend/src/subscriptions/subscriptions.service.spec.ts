/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BillingPlan,
  PlanCategory,
} from '../billing-plans/entities/billing-plan.entity';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import {
  Subscription,
  SubscriptionAccountType,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Behaviour tests for the mobile-recharge-style subscription system.
 *
 * Strategy: this service does heavy work inside `dataSource.transaction` and
 * raw SQL. We mock `DataSource` to capture every txn body, expose a fake
 * EntityManager, and assert on the calls each flow makes. The repositories
 * for `Subscription` / `BillingPlan` are stubbed as well.
 */
describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  // ── Fakes ────────────────────────────────────────────────────────────────
  let plans: Map<string, BillingPlan>;
  let subs: Subscription[];
  let queries: string[]; // captured raw SQL for assertions

  const makePlan = (overrides: Partial<BillingPlan> = {}): BillingPlan =>
    ({
      id: 'PLAN-VAL-30',
      name: 'Monthly 10k',
      planType: 'USER',
      planCategory: PlanCategory.VALIDITY_BASED,
      price: 499,
      currency: 'INR',
      credits: 10_000,
      validityDays: 30,
      description: null,
      features: [],
      isActive: true,
      isPopular: false,
      sortOrder: 0,
      createdByAdminId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    }) as BillingPlan;

  const makeSub = (overrides: Partial<Subscription> = {}): Subscription => ({
    id: `SUB-${subs.length + 1}`,
    accountType: SubscriptionAccountType.USER,
    userId: 'U1',
    enterpriseId: null,
    planId: 'PLAN-VAL-30',
    planCategory: PlanCategory.VALIDITY_BASED,
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86_400_000),
    totalCredits: '10000',
    usedCredits: '0',
    remainingCredits: '10000',
    parentSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    plans = new Map();
    subs = [];
    queries = [];

    const fakeEm = {
      query: jest.fn(async (sql: string, _params?: unknown[]) => {
        queries.push(sql.replace(/\s+/g, ' ').trim());
        // lockAccountRow expects [{ id }]
        if (sql.includes('SELECT id FROM')) return [{ id: 'OK' }];
        // latestQueuedOrActiveEnd
        if (sql.includes('SELECT end_date FROM subscriptions')) {
          const active = subs.find(
            (s) =>
              s.status === SubscriptionStatus.ACTIVE &&
              s.planCategory === PlanCategory.VALIDITY_BASED,
          );
          const queued = subs.find(
            (s) =>
              s.status === SubscriptionStatus.QUEUED &&
              s.planCategory === PlanCategory.VALIDITY_BASED,
          );
          const latest = queued?.endDate ?? active?.endDate ?? null;
          return latest ? [{ end_date: latest }] : [];
        }
        // writeLedger reads live balance
        if (sql.includes('SELECT credit_balance FROM')) {
          return [{ credit_balance: '0' }];
        }
        return [];
      }),
      create: jest.fn((_entity: unknown, payload: Subscription) => payload),
      save: jest.fn(async (row: Subscription) => {
        // For sub rows, push into the fake list.
        if ('accountType' in row && 'planCategory' in row) {
          const stored = makeSub(row);
          subs.push(stored);
          return stored;
        }
        return row;
      }),
      findOne: jest.fn(
        async (_entity, opts: { where: Record<string, unknown> }) => {
          // findActiveBase
          return (
            subs.find(
              (s) =>
                s.status === SubscriptionStatus.ACTIVE &&
                s.planCategory === PlanCategory.VALIDITY_BASED &&
                (opts.where.userId ? s.userId === opts.where.userId : true) &&
                (opts.where.enterpriseId
                  ? s.enterpriseId === opts.where.enterpriseId
                  : true),
            ) ?? null
          );
        },
      ),
      count: jest.fn(
        async () =>
          subs.filter((s) => s.status === SubscriptionStatus.ACTIVE).length,
      ),
      createQueryBuilder: jest.fn(() => makeQB(subs)),
    };

    const dataSource = {
      transaction: jest.fn(
        async (fn: (em: typeof fakeEm) => Promise<unknown>) => {
          return fn(fakeEm);
        },
      ),
    };

    const subRepo = {
      find: jest.fn(async () => subs),
      findOne: jest.fn(async () => subs[0] ?? null),
      createQueryBuilder: jest.fn(() => makeQB(subs)),
      count: jest.fn(async () => subs.length),
    };

    const planRepo = {
      findOne: jest.fn(async (opts: { where: { id: string } }) => {
        return plans.get(opts.where.id) ?? null;
      }),
      find: jest.fn(async () => [...plans.values()]),
    };

    const txRepo = { save: jest.fn(async (r: unknown) => r) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: 'DataSource', useValue: dataSource },
        { provide: getRepositoryToken(Subscription), useValue: subRepo },
        { provide: getRepositoryToken(BillingPlan), useValue: planRepo },
        { provide: getRepositoryToken(CreditTransaction), useValue: txRepo },
      ],
    })
      // The constructor uses `dataSource` injected by class, not token:
      .overrideProvider(SubscriptionsService)
      .useValue(
        new SubscriptionsService(
          dataSource as never,
          subRepo as never,
          planRepo as never,
          txRepo as never,
        ),
      )
      .compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  // ── 1. Buy validity plan with no active plan ─────────────────────────────
  it('purchaseValidityPlanForUser: creates an ACTIVE subscription when no plan active', async () => {
    const plan = makePlan();
    plans.set(plan.id, plan);

    const sub = await service.purchaseValidityPlanForUser('U1', plan.id);

    expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
    expect(sub.userId).toBe('U1');
    expect(sub.planCategory).toBe(PlanCategory.VALIDITY_BASED);
    expect(Number(sub.totalCredits)).toBe(plan.credits);
    expect(Number(sub.remainingCredits)).toBe(plan.credits);
    expect(sub.parentSubscriptionId).toBeNull();

    // endDate ≈ now + 30 days
    const days =
      ((sub.endDate as Date).getTime() - sub.startDate.getTime()) /
      (1000 * 60 * 60 * 24);
    expect(days).toBeCloseTo(30, 0);

    // Live balance update query was issued with the plan credits
    expect(
      queries.some(
        (q) => q.includes('UPDATE users') && q.includes('credit_balance'),
      ),
    ).toBe(true);
  });

  // ── 2. Buy validity while active → queued ────────────────────────────────
  it('purchaseValidityPlanForUser: queues a second purchase to start after the current end', async () => {
    const plan = makePlan();
    plans.set(plan.id, plan);

    // seed an active validity sub already in place
    const currentEnd = new Date(Date.now() + 10 * 86_400_000);
    subs.push(
      makeSub({
        status: SubscriptionStatus.ACTIVE,
        endDate: currentEnd,
      }),
    );

    const sub = await service.purchaseValidityPlanForUser('U1', plan.id);

    expect(sub.status).toBe(SubscriptionStatus.QUEUED);
    expect(sub.startDate.getTime()).toBe(currentEnd.getTime());

    const days =
      ((sub.endDate as Date).getTime() - sub.startDate.getTime()) /
      (1000 * 60 * 60 * 24);
    expect(days).toBeCloseTo(30, 0);
  });

  // ── 3. Buy top-up with active base ───────────────────────────────────────
  it('purchaseTopupForUser: creates ACTIVE top-up inheriting parent expiry', async () => {
    const validityPlan = makePlan();
    const topupPlan = makePlan({
      id: 'PLAN-TOP-1k',
      name: '1k Top-up',
      planCategory: PlanCategory.TOPUP,
      credits: 1_000,
      validityDays: null,
    });
    plans.set(validityPlan.id, validityPlan);
    plans.set(topupPlan.id, topupPlan);

    const parentEnd = new Date(Date.now() + 30 * 86_400_000);
    const parent = makeSub({
      id: 'PARENT',
      status: SubscriptionStatus.ACTIVE,
      endDate: parentEnd,
    });
    subs.push(parent);

    const sub = await service.purchaseTopupForUser('U1', topupPlan.id);

    expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
    expect(sub.planCategory).toBe(PlanCategory.TOPUP);
    expect(sub.parentSubscriptionId).toBe(parent.id);
    expect((sub.endDate as Date).getTime()).toBe(parentEnd.getTime());
    expect(Number(sub.totalCredits)).toBe(1_000);
  });

  // ── 4. Top-up rejected without active base ───────────────────────────────
  it('purchaseTopupForUser: rejects with BadRequestException when no active base plan', async () => {
    const topupPlan = makePlan({
      id: 'PLAN-TOP-1k',
      planCategory: PlanCategory.TOPUP,
      credits: 1_000,
      validityDays: null,
    });
    plans.set(topupPlan.id, topupPlan);

    await expect(
      service.purchaseTopupForUser('U1', topupPlan.id),
    ).rejects.toThrow(BadRequestException);
  });

  // ── 5. Plan lookup fails → NotFound ──────────────────────────────────────
  it('purchaseValidityPlanForUser: throws NotFound for unknown plan', async () => {
    await expect(
      service.purchaseValidityPlanForUser('U1', 'MISSING'),
    ).rejects.toThrow(NotFoundException);
  });

  // ── 6. Wrong category rejected ───────────────────────────────────────────
  it('purchaseValidityPlanForUser: rejects TOPUP plans', async () => {
    const topup = makePlan({
      id: 'TOPUP',
      planCategory: PlanCategory.TOPUP,
      validityDays: null,
    });
    plans.set(topup.id, topup);

    await expect(
      service.purchaseValidityPlanForUser('U1', topup.id),
    ).rejects.toThrow(BadRequestException);
  });

  // ── 7. Enterprise validity purchase ──────────────────────────────────────
  it('purchaseValidityPlanForEnterprise: creates ACTIVE enterprise subscription', async () => {
    const plan = makePlan();
    plans.set(plan.id, plan);

    const sub = await service.purchaseValidityPlanForEnterprise('E1', plan.id);

    expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
    expect(sub.accountType).toBe(SubscriptionAccountType.ENTERPRISE);
    expect(sub.enterpriseId).toBe('E1');
    expect(sub.userId).toBeNull();
    expect(queries.some((q) => q.includes('UPDATE enterprises'))).toBe(true);
  });

  // ── 8. Enterprise top-up purchase ────────────────────────────────────────
  it('purchaseTopupForEnterprise: creates top-up linked to active base for enterprise', async () => {
    const validity = makePlan();
    const topup = makePlan({
      id: 'TOPUP',
      planCategory: PlanCategory.TOPUP,
      credits: 500,
      validityDays: null,
    });
    plans.set(validity.id, validity);
    plans.set(topup.id, topup);

    const parent = makeSub({
      id: 'PARENT',
      accountType: SubscriptionAccountType.ENTERPRISE,
      userId: null,
      enterpriseId: 'E1',
      status: SubscriptionStatus.ACTIVE,
    });
    subs.push(parent);

    const sub = await service.purchaseTopupForEnterprise('E1', topup.id);

    expect(sub.parentSubscriptionId).toBe(parent.id);
    expect(sub.accountType).toBe(SubscriptionAccountType.ENTERPRISE);
    expect(sub.enterpriseId).toBe('E1');
  });

  // ── 9. Validity plan must have validityDays > 0 ──────────────────────────
  it('purchaseValidityPlanForUser: rejects plans with missing validityDays', async () => {
    const broken = makePlan({ validityDays: null });
    plans.set(broken.id, broken);

    await expect(
      service.purchaseValidityPlanForUser('U1', broken.id),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Minimal QueryBuilder mock that supports the fluent chain used by the
 * service: where / andWhere / orderBy / addOrderBy / setLock / getMany / getOne.
 */
function makeQB(subs: Subscription[]) {
  let result = [...subs];
  const filters: Array<(s: Subscription) => boolean> = [];
  const qb = {
    where(_: string, params?: Record<string, unknown>) {
      if (params?.id) {
        filters.push(
          (s) => s.userId === params.id || s.enterpriseId === params.id,
        );
      }
      if (params?.st) {
        filters.push((s) => s.status === params.st);
      }
      return qb;
    },
    andWhere(_: string, params?: Record<string, unknown>) {
      if (params?.st) {
        filters.push((s) => s.status === params.st);
      }
      if (params?.c) {
        filters.push((s) => s.planCategory === params.c);
      }
      if (params?.now) {
        filters.push(
          (s) => s.endDate !== null && s.endDate <= (params.now as Date),
        );
      }
      return qb;
    },
    orderBy() {
      return qb;
    },
    addOrderBy() {
      return qb;
    },
    setLock() {
      return qb;
    },
    async getMany() {
      return result.filter((s) => filters.every((f) => f(s)));
    },
    async getOne() {
      return result.filter((s) => filters.every((f) => f(s)))[0] ?? null;
    },
  };
  // re-bind result so multiple QB instances don't share state across tests
  result = [...subs];
  return qb;
}
