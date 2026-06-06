import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Email } from '../emails/entities/email.entity';

export type OverviewTab = 'single' | 'enterprise';

interface Range {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  days: number;
}

function buildRange(period = '7d', from?: string, to?: string): Range {
  const now = new Date();
  let start: Date;
  if (period === 'today') {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (period === '30d') {
    start = new Date(now);
    start.setDate(start.getDate() - 30);
  } else if (period === 'custom' && from && to) {
    start = new Date(from);
    const end = new Date(to);
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / 86400000),
    );
    const prevTo = new Date(start);
    const prevFrom = new Date(start);
    prevFrom.setDate(prevFrom.getDate() - days);
    return { from: start, to: end, prevFrom, prevTo, days };
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
  }
  const days = Math.max(
    1,
    Math.ceil((now.getTime() - start.getTime()) / 86400000),
  );
  const prevTo = new Date(start);
  const prevFrom = new Date(start);
  prevFrom.setDate(prevFrom.getDate() - days);
  return { from: start, to: now, prevFrom, prevTo, days };
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return +(((curr - prev) / prev) * 100).toFixed(1);
}

function n(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const parsed = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

const CACHE_TTL_MS = 30_000;

@Injectable()
export class AdminDashboardService {
  private cache = new Map<string, { at: number; data: unknown }>();

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Email) private readonly emailRepo: Repository<Email>,
    private readonly ds: DataSource,
  ) {}

  async getOverview(
    tab: OverviewTab = 'single',
    period = '7d',
    from?: string,
    to?: string,
  ) {
    const key = `${tab}|${period}|${from ?? ''}|${to ?? ''}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

    const range = buildRange(period, from, to);
    const data =
      tab === 'enterprise'
        ? await this.enterpriseOverview(range)
        : await this.singleOverview(range);

    this.cache.set(key, { at: Date.now(), data });
    return data;
  }

  private async singleOverview(r: Range) {
    const [
      userKpis,
      verifAgg,
      credits,
      expiry,
      verifTrend,
      signupTrend,
      recentUsers,
    ] = await Promise.all([
      this.singleUserKpis(r),
      this.singleVerificationAgg(r),
      this.singleCreditsTotals(r),
      this.singleExpiryAlerts(),
      this.singleVerificationTrend(r),
      this.singleSignupTrend(r),
      this.singleRecentUsers(),
    ]);

    return {
      kpis: {
        registeredUsers: userKpis.registered,
        activeUsers: userKpis.active,
        todaysSignups: userKpis.todaySignups,
        creditsUsed: credits.used,
        creditsRemaining: credits.remaining,
        deltas: {
          registeredUsers: pctDelta(userKpis.newCurrent, userKpis.newPrev),
          activeUsers: pctDelta(userKpis.newCurrent, userKpis.newPrev),
          todaysSignups: pctDelta(
            userKpis.todaySignups,
            userKpis.yesterdaySignups,
          ),
          creditsUsed: pctDelta(credits.usedCurrent, credits.usedPrev),
        },
      },
      verifications: {
        total: verifAgg.total,
        valid: verifAgg.valid,
        invalid: verifAgg.invalid,
        catchall: verifAgg.catchall,
        validRate: verifAgg.validRate,
        invalidRate: verifAgg.invalidRate,
        catchallRate: verifAgg.catchallRate,
        deltas: {
          total: pctDelta(verifAgg.total, verifAgg.prevTotal),
          validRate: +(verifAgg.validRate - verifAgg.prevValidRate).toFixed(1),
          invalidRate: +(
            verifAgg.invalidRate - verifAgg.prevInvalidRate
          ).toFixed(1),
          catchallRate: +(
            verifAgg.catchallRate - verifAgg.prevCatchallRate
          ).toFixed(1),
        },
      },
      credits: {
        used: credits.used,
        remaining: credits.remaining,
        total: credits.used + credits.remaining,
        usedPct:
          credits.used + credits.remaining > 0
            ? +(
                (credits.used / (credits.used + credits.remaining)) *
                100
              ).toFixed(1)
            : 0,
      },
      expiryAlerts: expiry,
      verificationTrend: verifTrend,
      signupTrend,
      recentUsers,
    };
  }

  private async singleUserKpis(r: Range) {
    const rows = await this.ds.query<
      Array<{
        registered: string;
        active: string;
        today_signups: string;
        yesterday_signups: string;
        new_current: string;
        new_prev: string;
      }>
    >(
      `SELECT
        COUNT(*) FILTER (WHERE role = 'USER')                                     AS registered,
        COUNT(*) FILTER (WHERE role = 'USER' AND is_active = TRUE)                AS active,
        COUNT(*) FILTER (WHERE role = 'USER' AND created_at >= $1)                AS today_signups,
        COUNT(*) FILTER (WHERE role = 'USER' AND created_at >= $2 AND created_at < $1) AS yesterday_signups,
        COUNT(*) FILTER (WHERE role = 'USER' AND created_at BETWEEN $3 AND $4)    AS new_current,
        COUNT(*) FILTER (WHERE role = 'USER' AND created_at BETWEEN $5 AND $3)    AS new_prev
       FROM users`,
      [this.startOfToday(), this.startOfYesterday(), r.from, r.to, r.prevFrom],
    );
    const x = rows[0] ?? {};
    return {
      registered: n((x as any).registered),
      active: n((x as any).active),
      todaySignups: n((x as any).today_signups),
      yesterdaySignups: n((x as any).yesterday_signups),
      newCurrent: n((x as any).new_current),
      newPrev: n((x as any).new_prev),
    };
  }

  private async singleVerificationAgg(r: Range) {
    const rows = await this.ds.query<Array<Record<string, string>>>(
      `SELECT
        COUNT(*)                                                          AS total,
        COUNT(*) FILTER (WHERE e.verification_result = 'VALID')           AS valid,
        COUNT(*) FILTER (WHERE e.verification_result = 'INVALID')         AS invalid,
        COUNT(*) FILTER (WHERE e.verification_result = 'CATCHALL')        AS catchall,
        COUNT(*) FILTER (WHERE e.created_at BETWEEN $3 AND $4)            AS prev_total,
        COUNT(*) FILTER (WHERE e.created_at BETWEEN $3 AND $4 AND e.verification_result = 'VALID')    AS prev_valid,
        COUNT(*) FILTER (WHERE e.created_at BETWEEN $3 AND $4 AND e.verification_result = 'INVALID')  AS prev_invalid,
        COUNT(*) FILTER (WHERE e.created_at BETWEEN $3 AND $4 AND e.verification_result = 'CATCHALL') AS prev_catchall
       FROM emails e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.is_deleted = FALSE
         AND u.role = 'USER'
         AND ((e.created_at BETWEEN $1 AND $2) OR (e.created_at BETWEEN $3 AND $4))`,
      [r.from, r.to, r.prevFrom, r.prevTo],
    );
    const x = rows[0] ?? {};
    const total = n(x.total);
    const valid = n(x.valid);
    const invalid = n(x.invalid);
    const catchall = n(x.catchall);
    const prevTotal = n(x.prev_total);
    const prevValid = n(x.prev_valid);
    const prevInvalid = n(x.prev_invalid);
    const prevCatchall = n(x.prev_catchall);
    return {
      total,
      valid,
      invalid,
      catchall,
      validRate: total > 0 ? +((valid / total) * 100).toFixed(1) : 0,
      invalidRate: total > 0 ? +((invalid / total) * 100).toFixed(1) : 0,
      catchallRate: total > 0 ? +((catchall / total) * 100).toFixed(1) : 0,
      prevTotal,
      prevValidRate:
        prevTotal > 0 ? +((prevValid / prevTotal) * 100).toFixed(1) : 0,
      prevInvalidRate:
        prevTotal > 0 ? +((prevInvalid / prevTotal) * 100).toFixed(1) : 0,
      prevCatchallRate:
        prevTotal > 0 ? +((prevCatchall / prevTotal) * 100).toFixed(1) : 0,
    };
  }

  private async singleCreditsTotals(r: Range) {
    const [totalsRows, deltaRows] = await Promise.all([
      this.ds.query<Array<Record<string, string>>>(
        `SELECT
          COALESCE(SUM(credit_balance), 0) AS remaining,
          COALESCE(SUM(credits_used),   0) AS used
         FROM users
         WHERE role = 'USER'`,
      ),
      this.ds.query<Array<Record<string, string>>>(
        `SELECT
          COALESCE(SUM(ABS(delta)) FILTER (WHERE type = 'DEDUCTION' AND created_at BETWEEN $1 AND $2), 0) AS used_current,
          COALESCE(SUM(ABS(delta)) FILTER (WHERE type = 'DEDUCTION' AND created_at BETWEEN $3 AND $1), 0) AS used_prev
         FROM credit_transactions
         WHERE account_type = 'USER'`,
        [r.from, r.to, r.prevFrom],
      ),
    ]);
    return {
      used: n(totalsRows[0]?.used),
      remaining: n(totalsRows[0]?.remaining),
      usedCurrent: n(deltaRows[0]?.used_current),
      usedPrev: n(deltaRows[0]?.used_prev),
    };
  }

  private async singleExpiryAlerts() {
    const [countRow, rows] = await Promise.all([
      this.ds.query<Array<{ c: string }>>(
        `SELECT COUNT(*)::text AS c
         FROM subscriptions
         WHERE account_type = 'USER'
           AND status = 'ACTIVE'
           AND plan_category = 'VALIDITY_BASED'
           AND end_date IS NOT NULL
           AND end_date BETWEEN now() AND now() + INTERVAL '7 days'`,
      ),
      this.ds.query<
        Array<{
          id: string;
          name: string;
          plan_name: string;
          days_remaining: string;
        }>
      >(
        `SELECT
          u.id,
          u.name,
          bp.name AS plan_name,
          FLOOR(EXTRACT(EPOCH FROM (s.end_date - now())) / 86400)::text AS days_remaining
         FROM subscriptions s
         INNER JOIN users u         ON u.id = s.user_id
         INNER JOIN billing_plans bp ON bp.id = s.plan_id
         WHERE s.account_type = 'USER'
           AND s.status = 'ACTIVE'
           AND s.plan_category = 'VALIDITY_BASED'
           AND s.end_date IS NOT NULL
           AND s.end_date BETWEEN now() AND now() + INTERVAL '30 days'
         ORDER BY s.end_date ASC
         LIMIT 5`,
      ),
    ]);

    return {
      expiringIn7dCount: n(countRow[0]?.c),
      top: rows.map((r) => ({
        id: r.id,
        name: r.name,
        planName: r.plan_name,
        daysRemaining: n(r.days_remaining),
      })),
    };
  }

  private async singleVerificationTrend(r: Range) {
    const rows = await this.ds.query<
      Array<{
        day: string | Date;
        total: string;
        valid: string;
        invalid: string;
      }>
    >(
      `SELECT
        DATE_TRUNC('day', e.created_at)                                AS day,
        COUNT(*)                                                       AS total,
        COUNT(*) FILTER (WHERE e.verification_result = 'VALID')        AS valid,
        COUNT(*) FILTER (WHERE e.verification_result = 'INVALID')      AS invalid
       FROM emails e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.is_deleted = FALSE
         AND u.role = 'USER'
         AND e.created_at BETWEEN $1 AND $2
       GROUP BY DATE_TRUNC('day', e.created_at)
       ORDER BY 1 ASC`,
      [r.from, r.to],
    );
    return rows.map((row) => ({
      date: this.dayStr(row.day),
      total: n(row.total),
      valid: n(row.valid),
      invalid: n(row.invalid),
    }));
  }

  private async singleSignupTrend(r: Range) {
    const rows = await this.ds.query<
      Array<{ day: string | Date; count: string }>
    >(
      `SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*) AS count
       FROM users
       WHERE role = 'USER'
         AND created_at BETWEEN $1 AND $2
       GROUP BY 1
       ORDER BY 1 ASC`,
      [r.from, r.to],
    );
    return rows.map((row) => ({
      date: this.dayStr(row.day),
      count: n(row.count),
    }));
  }

  private async singleRecentUsers() {
    const rows = await this.ds.query<
      Array<{
        id: string;
        name: string;
        email: string;
        plan: string | null;
      }>
    >(
      `SELECT id, name, email, plan
       FROM users
       WHERE role = 'USER'
       ORDER BY created_at DESC
       LIMIT 5`,
    );
    return rows;
  }

  private async enterpriseOverview(r: Range) {
    const [
      kpis,
      usageTrend,
      planDistribution,
      recentEnterprises,
      expiryAlerts,
    ] = await Promise.all([
      this.enterpriseKpis(r),
      this.enterpriseUsageTrend(r),
      this.enterprisePlanDistribution(),
      this.enterpriseRecent(),
      this.enterpriseExpiryAlerts(),
    ]);

    return {
      expiryAlerts,
      kpis: {
        totalEnterprises: kpis.total,
        activeEnterprises: kpis.active,
        enterpriseUsers: kpis.members,
        teamCreditsAssigned: kpis.assigned,
        expiringPlans: kpis.expiring,
        deltas: {
          totalEnterprises: pctDelta(kpis.newCurrent, kpis.newPrev),
          activeEnterprises: pctDelta(kpis.active, kpis.activePrev),
          enterpriseUsers: pctDelta(kpis.members, kpis.membersPrev),
          teamCreditsAssigned: pctDelta(
            kpis.assignedCurrent,
            kpis.assignedPrev,
          ),
          expiringPlans: pctDelta(kpis.expiring, kpis.expiringPrev),
        },
      },
      usageTrend,
      planDistribution,
      recentEnterprises,
    };
  }

  private async enterpriseExpiryAlerts() {
    const [countRow, rows] = await Promise.all([
      this.ds.query<Array<{ c: string }>>(
        `SELECT COUNT(*)::text AS c
         FROM subscriptions
         WHERE account_type = 'ENTERPRISE'
           AND status = 'ACTIVE'
           AND plan_category = 'VALIDITY_BASED'
           AND end_date IS NOT NULL
           AND end_date BETWEEN now() AND now() + INTERVAL '7 days'`,
      ),
      this.ds.query<
        Array<{
          id: string;
          name: string;
          domain: string | null;
          plan_name: string;
          days_remaining: string;
        }>
      >(
        `SELECT
          e.id,
          e.name,
          e.domain,
          bp.name AS plan_name,
          FLOOR(EXTRACT(EPOCH FROM (s.end_date - now())) / 86400)::text AS days_remaining
         FROM subscriptions s
         INNER JOIN enterprises e   ON e.id = s.enterprise_id
         INNER JOIN billing_plans bp ON bp.id = s.plan_id
         WHERE s.account_type = 'ENTERPRISE'
           AND s.status = 'ACTIVE'
           AND s.plan_category = 'VALIDITY_BASED'
           AND s.end_date IS NOT NULL
           AND s.end_date BETWEEN now() AND now() + INTERVAL '30 days'
           AND e.deleted_at IS NULL
         ORDER BY s.end_date ASC
         LIMIT 5`,
      ),
    ]);

    return {
      expiringIn7dCount: n(countRow[0]?.c),
      top: rows.map((r) => ({
        id: r.id,
        name: r.name,
        domain: r.domain ?? '',
        planName: r.plan_name,
        daysRemaining: n(r.days_remaining),
      })),
    };
  }

  private async enterpriseKpis(r: Range) {
    const [entRows, memberRows, assignedRows, txRows, expiringRows] =
      await Promise.all([
        this.ds.query<Array<Record<string, string>>>(
          `SELECT
            COUNT(*)                                              AS total,
            COUNT(*) FILTER (WHERE is_active = TRUE)              AS active,
            COUNT(*) FILTER (WHERE created_at BETWEEN $1 AND $2)  AS new_current,
            COUNT(*) FILTER (WHERE created_at BETWEEN $3 AND $1)  AS new_prev,
            COUNT(*) FILTER (WHERE is_active = TRUE AND created_at < $3) AS active_prev
           FROM enterprises
           WHERE deleted_at IS NULL`,
          [r.from, r.to, r.prevFrom],
        ),
        this.ds.query<Array<Record<string, string>>>(
          `SELECT
            COUNT(*) FILTER (WHERE is_active = TRUE)                                    AS members,
            COUNT(*) FILTER (WHERE is_active = TRUE AND created_at < $1)                AS members_prev
           FROM users
           WHERE enterprise_id IS NOT NULL`,
          [r.from],
        ),
        this.ds.query<Array<{ assigned: string }>>(
          `SELECT COALESCE(SUM(credit_limit), 0) AS assigned
           FROM users
           WHERE enterprise_id IS NOT NULL`,
        ),
        this.ds.query<Array<Record<string, string>>>(
          `SELECT
            COALESCE(SUM(delta) FILTER (WHERE reason = 'ADMIN_ALLOCATION' AND created_at BETWEEN $1 AND $2), 0) AS assigned_current,
            COALESCE(SUM(delta) FILTER (WHERE reason = 'ADMIN_ALLOCATION' AND created_at BETWEEN $3 AND $1), 0) AS assigned_prev
           FROM credit_transactions
           WHERE account_type = 'ENTERPRISE'`,
          [r.from, r.to, r.prevFrom],
        ),
        this.ds.query<Array<Record<string, string>>>(
          `SELECT
            COUNT(*) FILTER (WHERE end_date BETWEEN now() AND now() + INTERVAL '7 days') AS expiring,
            COUNT(*) FILTER (WHERE end_date BETWEEN now() - INTERVAL '7 days' AND now()) AS expiring_prev
           FROM subscriptions
           WHERE account_type = 'ENTERPRISE'
             AND status = 'ACTIVE'
             AND plan_category = 'VALIDITY_BASED'
             AND end_date IS NOT NULL`,
        ),
      ]);

    const e = entRows[0] ?? {};
    const m = memberRows[0] ?? {};
    const t = txRows[0] ?? {};
    const x = expiringRows[0] ?? {};
    return {
      total: n((e as any).total),
      active: n((e as any).active),
      activePrev: n((e as any).active_prev),
      newCurrent: n((e as any).new_current),
      newPrev: n((e as any).new_prev),
      members: n((m as any).members),
      membersPrev: n((m as any).members_prev),
      assigned: n((assignedRows[0] as any)?.assigned),
      assignedCurrent: n((t as any).assigned_current),
      assignedPrev: n((t as any).assigned_prev),
      expiring: n((x as any).expiring),
      expiringPrev: n((x as any).expiring_prev),
    };
  }

  private async enterpriseUsageTrend(r: Range) {
    const rows = await this.ds.query<
      Array<{ day: Date | string; verifications: string }>
    >(
      `SELECT
        DATE_TRUNC('day', e.created_at) AS day,
        COUNT(*)                        AS verifications
       FROM emails e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.is_deleted = FALSE
         AND u.enterprise_id IS NOT NULL
         AND e.created_at BETWEEN $1 AND $2
       GROUP BY 1
       ORDER BY 1 ASC`,
      [r.from, r.to],
    );
    return rows.map((row) => ({
      date: this.dayStr(row.day),
      verifications: n(row.verifications),
    }));
  }

  private async enterprisePlanDistribution() {
    const rows = await this.ds.query<
      Array<{ plan_name: string; count: string }>
    >(
      `SELECT bp.name AS plan_name, COUNT(*) AS count
       FROM subscriptions s
       INNER JOIN billing_plans bp ON bp.id = s.plan_id
       WHERE s.account_type = 'ENTERPRISE'
         AND s.status = 'ACTIVE'
       GROUP BY bp.name
       ORDER BY 2 DESC
       LIMIT 6`,
    );
    const total = rows.reduce((sum, r) => sum + n(r.count), 0);
    return rows.map((r) => ({
      planName: r.plan_name,
      count: n(r.count),
      pct: total > 0 ? +((n(r.count) / total) * 100).toFixed(1) : 0,
    }));
  }

  private async enterpriseRecent() {
    const rows = await this.ds.query<
      Array<{
        id: string;
        name: string;
        domain: string | null;
        is_active: boolean;
        credits_used: string;
        credits_assigned: string;
        plan_name: string | null;
        users_count: string;
      }>
    >(
      `SELECT
        e.id,
        e.name,
        e.domain,
        e.is_active,
        e.credits_used,
        COALESCE(e.total_purchased_credits, 0) AS credits_assigned,
        (
          SELECT bp.name
          FROM subscriptions s
          INNER JOIN billing_plans bp ON bp.id = s.plan_id
          WHERE s.enterprise_id = e.id AND s.status = 'ACTIVE'
          ORDER BY s.created_at DESC
          LIMIT 1
        ) AS plan_name,
        (
          SELECT COUNT(*)
          FROM users u
          WHERE u.enterprise_id = e.id AND u.is_active = TRUE
        ) AS users_count
       FROM enterprises e
       WHERE e.deleted_at IS NULL
       ORDER BY e.created_at DESC
       LIMIT 10`,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      domain: r.domain ?? '',
      planName: r.plan_name ?? '—',
      users: n(r.users_count),
      creditsUsed: n(r.credits_used),
      creditsAssigned: n(r.credits_assigned),
      status: r.is_active ? 'Active' : 'Inactive',
    }));
  }

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfYesterday(): Date {
    const d = this.startOfToday();
    d.setDate(d.getDate() - 1);
    return d;
  }

  private dayStr(v: Date | string): string {
    return v instanceof Date
      ? v.toISOString().split('T')[0]
      : String(v).split('T')[0];
  }
}
