import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { EmailList } from '../email-lists/entities/email-list.entity';
import { Email, EmailStatus } from '../emails/entities/email.entity';
import { Plan } from '../users/entities/user.entity';

// Per-user monthly quotas are disabled. A large sentinel keeps any
// remaining client-side math (percentage, remaining) well-defined.
const UNLIMITED = 1_000_000_000;
const PLAN_LIMITS: Record<Plan, number> = {
  [Plan.PRO]: UNLIMITED,
  [Plan.ULTIMATE]: UNLIMITED,
};

export type UsageType = 'all' | 'single' | 'bulk';
export type UsagePeriod = '7d' | '14d' | '30d';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
    @InjectRepository(EmailList)
    private readonly listsRepo: Repository<EmailList>,
  ) {}

  /**
   * Current-period quota usage. Resets on the 1st of each month.
   * Counts every verified email (single + bulk) created in the current month.
   */
  async getQuota(userId: string, plan: Plan) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const used = await this.emailsRepo.count({
      where: { userId, createdAt: Between(periodStart, now) },
    });

    const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS[Plan.PRO];
    const percentage = limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0;

    return {
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      percentage,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      resetDate: periodEnd.toISOString(),
    };
  }

  /**
   * Single vs bulk totals over the requested period. Powers the two breakdown
   * tiles. `bulk` counts emails that belong to any email_list (`isSingleVerify
   * = false`); `single` counts the rest.
   */
  async getBreakdown(userId: string, period: UsagePeriod) {
    const since = this.periodStart(period);
    const rows = await this.emailsRepo.find({
      where: { userId, createdAt: Between(since, new Date()) },
      select: ['isSingleVerify'],
    });

    let single = 0;
    let bulk = 0;
    for (const r of rows) {
      if (r.isSingleVerify) single++;
      else bulk++;
    }

    return { single, bulk, total: single + bulk, period };
  }

  /**
   * Per-day usage buckets — date stamps follow the user's local day boundaries
   * computed in JS (good enough for the chart's day-resolution accuracy).
   */
  async getChart(userId: string, period: UsagePeriod) {
    const since = this.periodStart(period);
    const rows = await this.emailsRepo.find({
      where: { userId, createdAt: Between(since, new Date()) },
      select: ['createdAt', 'isSingleVerify'],
    });

    // Build a date → bucket map seeded with every day in range so the chart
    // doesn't skip empty days.
    const days = this.daysBetween(since, new Date());
    const map = new Map<string, { date: string; single: number; bulk: number }>();
    for (const d of days) {
      map.set(d, { date: this.formatLabel(d), single: 0, bulk: 0 });
    }

    for (const r of rows) {
      const key = this.dateKey(r.createdAt);
      const bucket = map.get(key);
      if (!bucket) continue;
      if (r.isSingleVerify) bucket.single++;
      else bucket.bulk++;
    }

    return Array.from(map.values());
  }

  /**
   * Paginated usage log. Each row is either a single verification (1 credit)
   * or a bulk job (credits = totalCount of the list).
   */
  async getLog(
    userId: string,
    page: number,
    limit: number,
    type: UsageType,
  ) {
    // We page against a UNION of the two sources. Since paging across tables
    // is awkward, fetch a generous window then slice in memory — fine for
    // typical user volumes.
    const fetchSingles = type !== 'bulk';
    const fetchBulks = type !== 'single';

    const [singleRows, bulkRows] = await Promise.all([
      fetchSingles
        ? this.emailsRepo.find({
            where: { userId, isSingleVerify: true, status: EmailStatus.COMPLETED },
            order: { createdAt: 'DESC' },
            take: 500,
          })
        : Promise.resolve([]),
      fetchBulks
        ? this.listsRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 500,
          })
        : Promise.resolve([]),
    ]);

    type Entry = {
      id: string;
      type: 'single' | 'bulk';
      label: string;
      credits: number;
      occurredAt: string;
    };

    const entries: Entry[] = [
      ...singleRows.map<Entry>((e) => ({
        id: `single-${e.id}`,
        type: 'single',
        label: e.address,
        credits: 1,
        occurredAt: (e.processedAt ?? e.createdAt).toISOString(),
      })),
      ...bulkRows.map<Entry>((l) => ({
        id: `bulk-${l.id}`,
        type: 'bulk',
        label: l.originalFilename ?? l.name,
        credits: l.totalCount,
        occurredAt: l.createdAt.toISOString(),
      })),
    ].sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    const total = entries.length;
    const start = (page - 1) * limit;
    const data = entries.slice(start, start + limit);
    return { data, total, page, limit };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private periodStart(period: UsagePeriod): Date {
    const days = period === '30d' ? 30 : period === '14d' ? 14 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    return since;
  }

  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private daysBetween(start: Date, end: Date): string[] {
    const out: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      out.push(this.dateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }

  private formatLabel(key: string): string {
    // "2026-05-09" → "May 9"
    const [, m, d] = key.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[(m ?? 1) - 1]} ${d ?? 1}`;
  }
}
