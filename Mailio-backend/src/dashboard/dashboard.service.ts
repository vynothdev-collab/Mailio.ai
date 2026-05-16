import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  EmailList,
  EmailListStatus,
} from '../email-lists/entities/email-list.entity';
import { Email, EmailStatus } from '../emails/entities/email.entity';
import { VerificationResult } from '../common/types/verification-result.enum';
import { Plan } from '../users/entities/user.entity';

// Per-user monthly quotas are disabled. Sentinel keeps client math sane.
const UNLIMITED = 1_000_000_000;
const PLAN_LIMITS: Record<Plan, number> = {
  [Plan.PRO]: UNLIMITED,
  [Plan.ULTIMATE]: UNLIMITED,
};

const CHART_COLORS = {
  [VerificationResult.VALID]: '#22c55e',
  [VerificationResult.INVALID]: '#ef4444',
  [VerificationResult.RISKY]: '#f59e0b',
  [VerificationResult.UNKNOWN]: '#6b7280',
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
    @InjectRepository(EmailList)
    private readonly listsRepo: Repository<EmailList>,
  ) {}

  async getStats(userId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [currentPeriod, allTime] = await Promise.all([
      this.emailsRepo.find({
        where: { userId, createdAt: Between(sevenDaysAgo, now) },
        select: ['verificationResult', 'disposable'],
      }),
      this.emailsRepo.count({ where: { userId } }),
    ]);

    const currentValid = currentPeriod.filter(
      (e) => e.verificationResult === VerificationResult.VALID,
    ).length;
    const currentInvalid = currentPeriod.filter(
      (e) => e.verificationResult === VerificationResult.INVALID,
    ).length;
    const currentTotal = currentPeriod.length;

    const validRate =
      currentTotal > 0
        ? Math.round((currentValid / currentTotal) * 1000) / 10
        : 0;
    const invalidRate =
      currentTotal > 0
        ? Math.round((currentInvalid / currentTotal) * 1000) / 10
        : 0;

    return {
      totalVerified: allTime,
      validRate,
      invalidRate,
    };
  }

  async getActiveJob(userId: string) {
    const list = await this.listsRepo.findOne({
      where: [
        { userId, status: EmailListStatus.PROCESSING },
        { userId, status: EmailListStatus.PENDING },
      ],
      order: { createdAt: 'DESC' },
    });
    if (!list) return null;

    const remaining = list.totalCount - list.processedCount;
    let etaSeconds = Math.round(remaining / 1.1);
    if (list.startedAt && list.processedCount > 0) {
      const elapsedSec = (Date.now() - list.startedAt.getTime()) / 1000;
      const rate = list.processedCount / elapsedSec;
      if (rate > 0) etaSeconds = Math.round(remaining / rate);
    }

    return {
      jobId: list.id,
      fileName: list.originalFilename ?? list.name,
      progress:
        list.totalCount > 0
          ? Math.round((list.processedCount / list.totalCount) * 100)
          : 0,
      processedCount: list.processedCount,
      totalCount: list.totalCount,
      etaSeconds,
      startedAt: list.startedAt,
      valid: list.validCount,
      invalid: list.invalidCount,
      risky: list.riskyCount,
      disposable: list.disposableCount,
    };
  }

  async getRecentVerifications(userId: string, page: number, limit: number) {
    const [rows, total] = await this.emailsRepo.findAndCount({
      where: { userId, status: EmailStatus.COMPLETED },
      order: { processedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = rows.map((e) => ({
      id: e.id,
      email: e.address,
      status: e.verificationResult?.toLowerCase() ?? 'unknown',
      risk: this.toRisk(e.verificationResult),
      verifiedAt: e.processedAt ?? e.createdAt,
      isBulk: !e.isSingleVerify,
    }));

    return { data, total, page, limit };
  }

  async getChart(userId: string, period: string) {
    const days = period === '30d' ? 30 : period === '14d' ? 14 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await this.emailsRepo.find({
      where: { userId, createdAt: Between(since, new Date()) },
      select: ['verificationResult'],
    });

    const total = rows.length;
    const counts: Record<string, number> = {
      [VerificationResult.VALID]: 0,
      [VerificationResult.INVALID]: 0,
      [VerificationResult.RISKY]: 0,
      [VerificationResult.UNKNOWN]: 0,
    };

    for (const r of rows) {
      if (r.verificationResult) counts[r.verificationResult]++;
    }

    const pct = (n: number) =>
      total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

    return {
      data: [
        {
          name: 'Valid',
          value: counts[VerificationResult.VALID],
          percentage: pct(counts[VerificationResult.VALID]),
          color: CHART_COLORS[VerificationResult.VALID],
        },
        {
          name: 'Invalid',
          value: counts[VerificationResult.INVALID],
          percentage: pct(counts[VerificationResult.INVALID]),
          color: CHART_COLORS[VerificationResult.INVALID],
        },
        {
          name: 'Risky',
          value: counts[VerificationResult.RISKY],
          percentage: pct(counts[VerificationResult.RISKY]),
          color: CHART_COLORS[VerificationResult.RISKY],
        },
        {
          name: 'Unknown',
          value: counts[VerificationResult.UNKNOWN],
          percentage: pct(counts[VerificationResult.UNKNOWN]),
          color: CHART_COLORS[VerificationResult.UNKNOWN],
        },
      ],
      total,
    };
  }

  async getUsage(userId: string, plan: Plan) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const used = await this.emailsRepo.count({
      where: { userId, createdAt: Between(startOfMonth, new Date()) },
    });

    return { used, total: PLAN_LIMITS[plan] ?? PLAN_LIMITS[Plan.PRO], plan };
  }

  private toRisk(result: VerificationResult | null): string {
    if (result === VerificationResult.VALID) return 'low';
    if (result === VerificationResult.RISKY) return 'medium';
    if (result === VerificationResult.INVALID) return 'high';
    return 'unknown';
  }
}
