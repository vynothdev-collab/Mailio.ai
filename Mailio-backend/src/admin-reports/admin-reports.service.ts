import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type AudienceTab = 'single' | 'enterprise';

type DateRange = { from: Date; to: Date };

export interface DeltaStat {
  value: number;
  deltaPct: number;
}

export interface ReportsSummary {
  range: { from: string; to: string; days: number };
  stats: {
    totalVerifications: DeltaStat;
    validRate: DeltaStat;
    creditsUsed: DeltaStat;
    revenue: DeltaStat & { currency: string };
    offerRedemptions: DeltaStat;
  };
}

export interface ReportsVerifications {
  trend: Array<{
    date: string;
    total: number;
    valid: number;
    invalid: number;
    catchall: number;
    failed: number;
  }>;
  breakdown: {
    valid: number;
    invalid: number;
    catchall: number;
    failed: number;
    total: number;
  };
  totals: {
    total: number;
    valid: number;
    invalid: number;
    failed: number;
  };
}

export interface ReportsDistribution {
  creditsByPlan: Array<{
    planId: string | null;
    planName: string;
    credits: number;
    pct: number;
  }>;
  signupsTrend: Array<{
    date: string;
    singleUsers: number;
    enterprises: number;
  }>;
  signupsTotals: {
    singleUsers: number;
    singleUsersDeltaPct: number;
    enterprises: number;
    enterprisesDeltaPct: number;
  };
}

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);
  private readonly cache = new Map<
    string,
    { expiresAt: number; payload: unknown }
  >();
  private static readonly CACHE_TTL_MS = 30 * 1000;

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async getSummary(
    tab: AudienceTab,
    period: string,
    from?: string,
    to?: string,
  ): Promise<ReportsSummary> {
    const { range, prev, days } = this.windows(period, from, to);
    return this.memo(`summary|${tab}`, range, async () => {
      const audience = this.audienceJoinClause(tab);
      const [verification, credits, revenue] = await Promise.all([
        this.queryVerificationStatTotals(range, prev, audience),
        this.queryCreditsUsed(range, prev, tab),
        this.queryRevenue(range, prev, tab),
      ]);
      const totalNow = verification.total;
      const totalPrev = verification.prevTotal;
      const validRateNow =
        totalNow > 0 ? +((verification.valid / totalNow) * 100).toFixed(1) : 0;
      const validRatePrev =
        totalPrev > 0
          ? +((verification.prevValid / totalPrev) * 100).toFixed(1)
          : 0;

      return {
        range: {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          days,
        },
        stats: {
          totalVerifications: {
            value: totalNow,
            deltaPct: this.deltaPct(totalNow, totalPrev),
          },
          validRate: {
            value: validRateNow,
            deltaPct: +(validRateNow - validRatePrev).toFixed(1),
          },
          creditsUsed: {
            value: credits.now,
            deltaPct: this.deltaPct(credits.now, credits.prev),
          },
          revenue: {
            value: revenue.now,
            deltaPct: this.deltaPct(revenue.now, revenue.prev),
            currency: revenue.currency,
          },
          offerRedemptions: { value: 0, deltaPct: 0 },
        },
      };
    });
  }

  async getVerifications(
    tab: AudienceTab,
    period: string,
    from?: string,
    to?: string,
  ): Promise<ReportsVerifications> {
    const { range } = this.windows(period, from, to);
    return this.memo(`verifications|${tab}`, range, async () => {
      const audience = this.audienceJoinClause(tab);
      const [trend, breakdown] = await Promise.all([
        this.queryVerificationTrend(range, audience),
        this.queryVerificationBreakdown(range, audience),
      ]);
      return {
        trend,
        breakdown,
        totals: {
          total: breakdown.total,
          valid: breakdown.valid,
          invalid: breakdown.invalid,
          failed: breakdown.failed,
        },
      };
    });
  }

  async getDistribution(
    tab: AudienceTab,
    period: string,
    from?: string,
    to?: string,
  ): Promise<ReportsDistribution> {
    const { range, prev } = this.windows(period, from, to);
    return this.memo(`distribution|${tab}`, range, async () => {
      const [creditsByPlan, signupsTotals, signupsTrend] = await Promise.all([
        this.queryCreditsByPlan(range, tab),
        this.querySignupsTotals(range, prev),
        this.querySignupsTrend(range),
      ]);
      return {
        creditsByPlan,
        signupsTrend,
        signupsTotals: {
          singleUsers: signupsTotals.singleNow,
          singleUsersDeltaPct: this.deltaPct(
            signupsTotals.singleNow,
            signupsTotals.singlePrev,
          ),
          enterprises: signupsTotals.entNow,
          enterprisesDeltaPct: this.deltaPct(
            signupsTotals.entNow,
            signupsTotals.entPrev,
          ),
        },
      };
    });
  }

  private async queryVerificationStatTotals(
    range: DateRange,
    prev: DateRange,
    audience: AudienceJoin,
  ) {
    const rows = await this.ds.query<
      {
        total: string;
        valid: string;
        prev_total: string;
        prev_valid: string;
      }[]
    >(
      `
      SELECT
        COUNT(*) FILTER (WHERE e.created_at BETWEEN $1 AND $2)                                                  AS total,
        COUNT(*) FILTER (WHERE e.created_at BETWEEN $1 AND $2 AND e.verification_result = 'VALID')              AS valid,
        COUNT(*) FILTER (WHERE e.created_at BETWEEN $3 AND $4)                                                  AS prev_total,
        COUNT(*) FILTER (WHERE e.created_at BETWEEN $3 AND $4 AND e.verification_result = 'VALID')              AS prev_valid
      FROM emails e
      ${audience.join}
      WHERE e.is_deleted = FALSE
        AND e.created_at BETWEEN $3 AND $2
        ${audience.where}
      `,
      [range.from, range.to, prev.from, prev.to],
    );
    const r = rows[0] ?? ({} as Record<string, string>);
    return {
      total: +(r.total ?? 0),
      valid: +(r.valid ?? 0),
      prevTotal: +(r.prev_total ?? 0),
      prevValid: +(r.prev_valid ?? 0),
    };
  }

  private async queryVerificationBreakdown(
    range: DateRange,
    audience: AudienceJoin,
  ) {
    const rows = await this.ds.query<
      {
        total: string;
        valid: string;
        invalid: string;
        catchall: string;
        failed: string;
      }[]
    >(
      `
      SELECT
        COUNT(*)                                                                          AS total,
        COUNT(*) FILTER (WHERE e.verification_result = 'VALID')                          AS valid,
        COUNT(*) FILTER (WHERE e.verification_result = 'INVALID')                        AS invalid,
        COUNT(*) FILTER (WHERE e.verification_result = 'CATCHALL')                       AS catchall,
        COUNT(*) FILTER (WHERE e.status = 'FAILED')     AS failed
      FROM emails e
      ${audience.join}
      WHERE e.is_deleted = FALSE
        AND e.created_at BETWEEN $1 AND $2
        ${audience.where}
      `,
      [range.from, range.to],
    );
    const r = rows[0] ?? ({} as Record<string, string>);
    return {
      total: +(r.total ?? 0),
      valid: +(r.valid ?? 0),
      invalid: +(r.invalid ?? 0),
      catchall: +(r.catchall ?? 0),
      failed: +(r.failed ?? 0),
    };
  }

  private async queryVerificationTrend(
    range: DateRange,
    audience: AudienceJoin,
  ) {
    const rows = await this.ds.query<
      {
        day: Date;
        total: string;
        valid: string;
        invalid: string;
        catchall: string;
        failed: string;
      }[]
    >(
      `
      SELECT
        DATE_TRUNC('day', e.created_at)                                                 AS day,
        COUNT(*)                                                                        AS total,
        COUNT(*) FILTER (WHERE e.verification_result = 'VALID')                        AS valid,
        COUNT(*) FILTER (WHERE e.verification_result = 'INVALID')                      AS invalid,
        COUNT(*) FILTER (WHERE e.verification_result = 'CATCHALL')                     AS catchall,
        COUNT(*) FILTER (WHERE e.status = 'FAILED')   AS failed
      FROM emails e
      ${audience.join}
      WHERE e.is_deleted = FALSE
        AND e.created_at BETWEEN $1 AND $2
        ${audience.where}
      GROUP BY DATE_TRUNC('day', e.created_at)
      ORDER BY day ASC
      `,
      [range.from, range.to],
    );
    return rows.map((r) => ({
      date: this.dayOnly(r.day),
      total: +r.total,
      valid: +r.valid,
      invalid: +r.invalid,
      catchall: +r.catchall,
      failed: +r.failed,
    }));
  }

  private async queryCreditsUsed(
    range: DateRange,
    prev: DateRange,
    tab: AudienceTab,
  ) {
    const accountType = tab === 'enterprise' ? 'ENTERPRISE' : 'USER';
    const rows = await this.ds.query<{ now_sum: string; prev_sum: string }[]>(
      `
      SELECT
        COALESCE(SUM(ABS(delta)) FILTER (WHERE created_at BETWEEN $2 AND $3), 0) AS now_sum,
        COALESCE(SUM(ABS(delta)) FILTER (WHERE created_at BETWEEN $4 AND $5), 0) AS prev_sum
      FROM credit_transactions
      WHERE account_type = $1
        AND type = 'DEDUCTION'
        AND created_at BETWEEN $4 AND $3
      `,
      [accountType, range.from, range.to, prev.from, prev.to],
    );
    return { now: +(rows[0]?.now_sum ?? 0), prev: +(rows[0]?.prev_sum ?? 0) };
  }

  private async queryCreditsByPlan(range: DateRange, tab: AudienceTab) {
    const accountType = tab === 'enterprise' ? 'ENTERPRISE' : 'USER';
    const rows = await this.ds.query<
      { plan_id: string | null; plan_name: string; credits: string }[]
    >(
      `
      SELECT
        bp.id                                AS plan_id,
        bp.name                              AS plan_name,
        COALESCE(SUM(s.used_credits), 0)     AS credits
      FROM subscriptions s
      JOIN billing_plans bp ON bp.id = s.plan_id
      WHERE s.account_type = $1
        AND s.start_date <= $3
        AND (s.end_date IS NULL OR s.end_date >= $2)
      GROUP BY bp.id, bp.name
      ORDER BY credits DESC
      LIMIT 10
      `,
      [accountType, range.from, range.to],
    );
    const total = rows.reduce((s, r) => s + +r.credits, 0);
    return rows.map((r) => ({
      planId: r.plan_id,
      planName: r.plan_name,
      credits: +r.credits,
      pct: total > 0 ? +((+r.credits / total) * 100).toFixed(1) : 0,
    }));
  }

  private async queryRevenue(
    range: DateRange,
    prev: DateRange,
    tab: AudienceTab,
  ) {
    const accountType = tab === 'enterprise' ? 'ENTERPRISE' : 'USER';
    const rows = await this.ds.query<
      { now_sum: string; prev_sum: string; currency: string | null }[]
    >(
      `
      SELECT
        COALESCE(SUM(bp.price) FILTER (WHERE s.start_date BETWEEN $2 AND $3), 0) AS now_sum,
        COALESCE(SUM(bp.price) FILTER (WHERE s.start_date BETWEEN $4 AND $5), 0) AS prev_sum,
        MAX(bp.currency) AS currency
      FROM subscriptions s
      JOIN billing_plans bp ON bp.id = s.plan_id
      WHERE s.account_type = $1
        AND s.start_date BETWEEN $4 AND $3
      `,
      [accountType, range.from, range.to, prev.from, prev.to],
    );
    return {
      now: +(rows[0]?.now_sum ?? 0),
      prev: +(rows[0]?.prev_sum ?? 0),
      currency: rows[0]?.currency ?? 'INR',
    };
  }

  private async querySignupsTotals(range: DateRange, prev: DateRange) {
    const rows = await this.ds.query<
      {
        single_now: string;
        single_prev: string;
        ent_now: string;
        ent_prev: string;
      }[]
    >(
      `
      SELECT
        COUNT(*) FILTER (WHERE u.role = 'USER'             AND u.created_at BETWEEN $1 AND $2) AS single_now,
        COUNT(*) FILTER (WHERE u.role = 'USER'             AND u.created_at BETWEEN $3 AND $4) AS single_prev,
        COUNT(*) FILTER (WHERE u.role = 'ENTERPRISE_ADMIN' AND u.created_at BETWEEN $1 AND $2) AS ent_now,
        COUNT(*) FILTER (WHERE u.role = 'ENTERPRISE_ADMIN' AND u.created_at BETWEEN $3 AND $4) AS ent_prev
      FROM users u
      WHERE u.created_at BETWEEN $3 AND $2
      `,
      [range.from, range.to, prev.from, prev.to],
    );
    const r = rows[0] ?? ({} as Record<string, string>);
    return {
      singleNow: +(r.single_now ?? 0),
      singlePrev: +(r.single_prev ?? 0),
      entNow: +(r.ent_now ?? 0),
      entPrev: +(r.ent_prev ?? 0),
    };
  }

  private async querySignupsTrend(range: DateRange) {
    const rows = await this.ds.query<
      { day: Date; single_users: string; enterprises: string }[]
    >(
      `
      SELECT
        DATE_TRUNC('day', u.created_at)                              AS day,
        COUNT(*) FILTER (WHERE u.role = 'USER')                     AS single_users,
        COUNT(*) FILTER (WHERE u.role = 'ENTERPRISE_ADMIN')         AS enterprises
      FROM users u
      WHERE u.created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('day', u.created_at)
      ORDER BY day ASC
      `,
      [range.from, range.to],
    );
    return rows.map((r) => ({
      date: this.dayOnly(r.day),
      singleUsers: +r.single_users,
      enterprises: +r.enterprises,
    }));
  }

  private audienceJoinClause(tab: AudienceTab): AudienceJoin {
    if (tab === 'enterprise') {
      return {
        join: 'JOIN users u ON u.id = e.user_id',
        where: `AND u.enterprise_id IS NOT NULL`,
      };
    }
    return {
      join: 'JOIN users u ON u.id = e.user_id',
      where: `AND u.enterprise_id IS NULL AND u.role = 'USER'`,
    };
  }

  private windows(period: string, from?: string, to?: string) {
    const range = this.buildRange(period, from, to);
    const days = Math.max(
      1,
      Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000),
    );
    const prev: DateRange = {
      from: new Date(range.from.getTime() - days * 86_400_000),
      to: range.from,
    };
    return { range, prev, days };
  }

  private buildRange(period: string, from?: string, to?: string): DateRange {
    const now = new Date();
    if (period === 'custom' && from && to) {
      return { from: new Date(from), to: new Date(to) };
    }
    if (period === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    }
    if (period === '30d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { from: start, to: now };
    }
    if (period === '90d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { from: start, to: now };
    }
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { from: start, to: now };
  }

  private deltaPct(now: number, prev: number): number {
    if (prev === 0) return now === 0 ? 0 : 100;
    return +(((now - prev) / prev) * 100).toFixed(1);
  }

  private dayOnly(d: Date | string): string {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().slice(0, 10);
  }

  private async memo<T>(
    key: string,
    range: DateRange,
    compute: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = `${key}|${range.from.toISOString()}|${range.to.toISOString()}`;
    const hit = this.cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.payload as T;
    const payload = await compute();
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + AdminReportsService.CACHE_TTL_MS,
      payload,
    });
    if (this.cache.size > 200) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    return payload;
  }
}

interface AudienceJoin {
  join: string;
  where: string;
}
