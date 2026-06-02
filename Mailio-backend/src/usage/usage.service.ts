import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { EmailList } from '../email-lists/entities/email-list.entity';
import { Email, EmailStatus } from '../emails/entities/email.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';

export type UsageType = 'all' | 'single' | 'bulk';
export type UsagePeriod = '7d' | '14d' | '30d';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
    @InjectRepository(EmailList)
    private readonly listsRepo: Repository<EmailList>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Enterprise)
    private readonly enterpriseRepo: Repository<Enterprise>,
  ) {}

  /**
   * Returns credit-based quota for the user's effective account.
   * - Enterprise members (USER + ADMIN) draw from the shared enterprise balance.
   * - Normal USER draws from personal balance.
   */
  async getQuota(user: User) {
    const isEnterprise =
      user.role === UserRole.ENTERPRISE_USER ||
      user.role === UserRole.ENTERPRISE_ADMIN;

    let creditBalance = 0;
    let creditsUsed = 0;
    let accountLabel = 'Personal';

    if (isEnterprise && user.enterpriseId) {
      const enterprise = await this.enterpriseRepo.findOne({
        where: { id: user.enterpriseId },
      });
      creditBalance = Number(enterprise?.creditBalance ?? 0);
      creditsUsed = Number(enterprise?.creditsUsed ?? 0);
      accountLabel = 'Enterprise';
    } else {
      creditBalance = Number(user.creditBalance ?? 0);
      creditsUsed = Number(user.creditsUsed ?? 0);
    }

    const totalEver = creditBalance + creditsUsed;
    const percentage =
      totalEver > 0 ? Math.round((creditsUsed / totalEver) * 1000) / 10 : 0;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      plan: user.plan,
      currentPlanId: user.currentPlanId ?? null,
      accountLabel,
      creditBalance,
      creditsUsed,
      percentage,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      resetDate: periodEnd.toISOString(),
      // legacy fields kept for backwards compat
      used: creditsUsed,
      limit: totalEver || creditBalance,
      remaining: creditBalance,
    };
  }

  async getBreakdown(userIds: string[], period: UsagePeriod) {
    // Breakdown tiles always show the CURRENT BILLING PERIOD (start of this
    // calendar month), regardless of the period param. The period param is kept
    // for the chart only.
    const now = new Date();
    const billingStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Single verify count this billing period
    const singleCount = await this.emailsRepo.count({
      where: {
        userId: In(userIds),
        isSingleVerify: true,
        createdAt: Between(billingStart, now),
      },
    });

    // Bulk jobs this billing period
    const bulkResult = await this.listsRepo
      .createQueryBuilder('l')
      .select('COUNT(l.id)', 'jobs')
      .addSelect('COALESCE(SUM(l.totalCount), 0)', 'credits')
      .where('l.userId IN (:...ids)', { ids: userIds })
      .andWhere('l.createdAt BETWEEN :since AND :now', { since: billingStart, now })
      .getRawOne<{ jobs: string; credits: string }>();

    const bulkJobs    = Number(bulkResult?.jobs    ?? 0);
    const bulkCredits = Number(bulkResult?.credits ?? 0);
    const total       = singleCount + bulkJobs;

    return {
      single:        singleCount,
      bulk:          bulkJobs,
      total,
      singleCredits: singleCount,
      bulkCredits,
      totalCredits:  singleCount + bulkCredits,
      period,
    };
  }

  async getChart(userIds: string[], period: UsagePeriod) {
    const since = this.periodStart(period);
    const rows = await this.emailsRepo.find({
      where: { userId: In(userIds), createdAt: Between(since, new Date()) },
      select: ['createdAt', 'isSingleVerify'],
    });

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

  async getLog(userIds: string[], page: number, limit: number, type: UsageType) {
    const fetchSingles = type !== 'bulk';
    const fetchBulks = type !== 'single';

    // Only show entries from the current billing period (start of current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [singleRows, bulkRows] = await Promise.all([
      fetchSingles
        ? this.emailsRepo.find({
            where: {
              userId: In(userIds),
              isSingleVerify: true,
              status: EmailStatus.COMPLETED,
              createdAt: Between(periodStart, now),
            },
            order: { createdAt: 'DESC' },
            take: 500,
          })
        : Promise.resolve([]),
      fetchBulks
        ? this.listsRepo.find({
            where: {
              userId: In(userIds),
              createdAt: Between(periodStart, now),
            },
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
    const [, m, d] = key.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[(m ?? 1) - 1]} ${d ?? 1}`;
  }
}
