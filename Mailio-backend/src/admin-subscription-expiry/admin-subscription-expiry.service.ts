import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type ExpiryTab = 'single' | 'enterprise';

export type ExpiryBucket =
  | 'TODAY'
  | 'WEEK'
  | 'MONTH'
  | 'EXPIRED'
  | 'ACTIVE'
  | 'ALL';

export interface ExpirySummary {
  expiringToday: number;
  expiringIn7d: number;
  expiringIn30d: number;
  expired: number;
}

export interface ExpiryRow {
  subscriptionId: string;
  accountId: string;
  accountName: string;
  accountEmail: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: string;
  bucket: Exclude<ExpiryBucket, 'ALL'>;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  daysRemaining: number;
}

export interface ExpiryListResponse {
  data: ExpiryRow[];
  total: number;
  page: number;
  limit: number;
}

export interface ExpiryPlan {
  id: string;
  name: string;
}

interface ListFilters {
  search?: string;
  planId?: string;
  bucket?: ExpiryBucket;
  page?: number;
  limit?: number;
}

interface CacheEntry {
  expiresAt: number;
  payload: unknown;
}

@Injectable()
export class AdminSubscriptionExpiryService {
  private readonly logger = new Logger(AdminSubscriptionExpiryService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private static readonly CACHE_TTL_MS = 30 * 1000;

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async getSummary(tab: ExpiryTab): Promise<ExpirySummary> {
    return this.memo(`summary|${tab}`, async () => {
      const accountType = tab === 'enterprise' ? 'ENTERPRISE' : 'USER';
      const rows = await this.ds.query<
        {
          expiring_today: string;
          expiring_7d: string;
          expiring_30d: string;
          expired: string;
        }[]
      >(
        `
        SELECT
          COUNT(*) FILTER (WHERE s.end_date >= now() AND s.end_date <  now() + interval '1 day')   AS expiring_today,
          COUNT(*) FILTER (WHERE s.end_date >= now() AND s.end_date <  now() + interval '7 days')  AS expiring_7d,
          COUNT(*) FILTER (WHERE s.end_date >= now() AND s.end_date <  now() + interval '30 days') AS expiring_30d,
          COUNT(*) FILTER (WHERE s.end_date <  now())                                              AS expired
        FROM subscriptions s
        WHERE s.account_type   = $1
          AND s.plan_category  = 'VALIDITY_BASED'
          AND s.status         IN ('ACTIVE','EXPIRED')
          AND s.deleted_at     IS NULL
          AND s.end_date       IS NOT NULL
        `,
        [accountType],
      );
      const r = rows[0] ?? ({} as Record<string, string>);
      return {
        expiringToday: +(r.expiring_today ?? 0),
        expiringIn7d: +(r.expiring_7d ?? 0),
        expiringIn30d: +(r.expiring_30d ?? 0),
        expired: +(r.expired ?? 0),
      };
    });
  }

  async listUsers(filters: ListFilters): Promise<ExpiryListResponse> {
    return this.listImpl('USER', filters);
  }

  async listEnterprises(filters: ListFilters): Promise<ExpiryListResponse> {
    return this.listImpl('ENTERPRISE', filters);
  }

  async listPlans(tab: ExpiryTab): Promise<ExpiryPlan[]> {
    return this.memo(`plans|${tab}`, async () => {
      const accountType = tab === 'enterprise' ? 'ENTERPRISE' : 'USER';
      const rows = await this.ds.query<{ id: string; name: string }[]>(
        `
        SELECT DISTINCT bp.id, bp.name
        FROM subscriptions s
        JOIN billing_plans bp ON bp.id = s.plan_id
        WHERE s.account_type  = $1
          AND s.plan_category = 'VALIDITY_BASED'
          AND s.status        IN ('ACTIVE','EXPIRED')
          AND s.deleted_at    IS NULL
        ORDER BY bp.name ASC
        `,
        [accountType],
      );
      return rows;
    });
  }

  private async listImpl(
    accountType: 'USER' | 'ENTERPRISE',
    filters: ListFilters,
  ): Promise<ExpiryListResponse> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    const bucket = filters.bucket ?? 'ALL';

    const accountTable = accountType === 'ENTERPRISE' ? 'enterprises' : 'users';

    const emailExpr =
      accountType === 'ENTERPRISE'
        ? `COALESCE((SELECT email FROM users u WHERE u.enterprise_id = a.id AND u.role = 'ENTERPRISE_ADMIN' ORDER BY u.created_at ASC LIMIT 1), '')`
        : `a.email`;

    const joinKey =
      accountType === 'ENTERPRISE' ? 's.enterprise_id' : 's.user_id';

    const bucketWhere = (() => {
      switch (bucket) {
        case 'TODAY':
          return `(s.end_date >= now() AND s.end_date <  now() + interval '1 day')`;
        case 'WEEK':
          return `(s.end_date >= now() AND s.end_date <  now() + interval '7 days')`;
        case 'MONTH':
          return `(s.end_date >= now() AND s.end_date <  now() + interval '30 days')`;
        case 'EXPIRED':
          return `(s.end_date <  now())`;
        case 'ACTIVE':
          return `(s.end_date >= now() + interval '30 days')`;
        case 'ALL':
        default:
          return `TRUE`;
      }
    })();

    const params: unknown[] = [accountType];
    const where: string[] = [
      `s.account_type   = $1`,
      `s.plan_category  = 'VALIDITY_BASED'`,
      `s.status         IN ('ACTIVE','EXPIRED')`,
      `s.deleted_at     IS NULL`,
      `s.end_date       IS NOT NULL`,
      bucketWhere,
    ];

    if (filters.planId) {
      params.push(filters.planId);
      where.push(`s.plan_id = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      const sp = `$${params.length}`;
      if (accountType === 'ENTERPRISE') {
        where.push(`(a.name ILIKE ${sp})`);
      } else {
        where.push(`(a.name ILIKE ${sp} OR a.email ILIKE ${sp})`);
      }
    }
    const whereSql = where.join(' AND ');

    const countRows = await this.ds.query<{ total: string }[]>(
      `
      SELECT COUNT(*) AS total
      FROM subscriptions s
      JOIN ${accountTable} a ON a.id = ${joinKey}
      WHERE ${whereSql}
      `,
      params,
    );
    const total = +(countRows[0]?.total ?? 0);

    const offset = (page - 1) * limit;
    params.push(limit, offset);
    const limitParam = `$${params.length - 1}`;
    const offsetParam = `$${params.length}`;

    const rows = await this.ds.query<
      {
        subscription_id: string;
        account_id: string;
        account_name: string;
        account_email: string;
        plan_id: string;
        plan_name: string;
        start_date: Date;
        end_date: Date;
        status: string;
        total_credits: string;
        used_credits: string;
        remaining_credits: string;
        bucket: ExpiryRow['bucket'];
        days_remaining: string;
      }[]
    >(
      `
      SELECT
        s.id                                                                AS subscription_id,
        a.id                                                                AS account_id,
        a.name                                                              AS account_name,
        ${emailExpr}                                                        AS account_email,
        bp.id                                                               AS plan_id,
        bp.name                                                             AS plan_name,
        s.start_date,
        s.end_date,
        s.status,
        s.total_credits,
        s.used_credits,
        s.remaining_credits,
        CASE
          WHEN s.end_date <  now()                              THEN 'EXPIRED'
          WHEN s.end_date <  now() + interval '1 day'           THEN 'TODAY'
          WHEN s.end_date <  now() + interval '7 days'          THEN 'WEEK'
          WHEN s.end_date <  now() + interval '30 days'         THEN 'MONTH'
          ELSE 'ACTIVE'
        END AS bucket,
        FLOOR(EXTRACT(EPOCH FROM (s.end_date - now())) / 86400) AS days_remaining
      FROM subscriptions s
      JOIN ${accountTable} a ON a.id = ${joinKey}
      JOIN billing_plans bp ON bp.id = s.plan_id
      WHERE ${whereSql}
      ORDER BY s.end_date ASC
      LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
      params,
    );

    return {
      data: rows.map((r) => ({
        subscriptionId: r.subscription_id,
        accountId: r.account_id,
        accountName: r.account_name,
        accountEmail: r.account_email,
        planId: r.plan_id,
        planName: r.plan_name,
        startDate: this.iso(r.start_date),
        endDate: this.iso(r.end_date),
        status: r.status,
        bucket: r.bucket,
        totalCredits: +r.total_credits,
        usedCredits: +r.used_credits,
        remainingCredits: +r.remaining_credits,
        daysRemaining: +r.days_remaining,
      })),
      total,
      page,
      limit,
    };
  }

  private iso(d: Date | string): string {
    return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
  }

  private async memo<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.payload as T;
    const payload = await compute();
    this.cache.set(key, {
      expiresAt: Date.now() + AdminSubscriptionExpiryService.CACHE_TTL_MS,
      payload,
    });
    if (this.cache.size > 100) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    return payload;
  }
}
