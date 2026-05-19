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

  async getRecentVerifications(
    userId: string,
    page: number,
    limit: number,
    filters: {
      status?: 'queued' | 'pending' | 'completed' | 'failed';
      from?: Date;
      to?: Date;
    } = {},
  ) {
    const offset = (page - 1) * limit;

    const params: unknown[] = [userId];
    const listStatusValue = this.statusToList(filters.status);
    const emailStatusValue = this.statusToEmail(filters.status);

    const listConditions = ['el.user_id = $1'];
    const emailConditions = ['e.user_id = $1', 'e.is_single_verify = TRUE'];

    if (listStatusValue) {
      params.push(listStatusValue);
      const idx = params.length;
      listConditions.push(`el.status = $${idx}::email_lists_status_enum`);
      params.push(emailStatusValue);
      const idx2 = params.length;
      emailConditions.push(`e.status = $${idx2}::emails_status_enum`);
    }

    if (filters.from) {
      params.push(filters.from);
      const idx = params.length;
      listConditions.push(`COALESCE(el.started_at, el.created_at) >= $${idx}`);
      emailConditions.push(`COALESCE(e.processed_at, e.created_at) >= $${idx}`);
    }
    if (filters.to) {
      params.push(filters.to);
      const idx = params.length;
      listConditions.push(`COALESCE(el.started_at, el.created_at) <= $${idx}`);
      emailConditions.push(`COALESCE(e.processed_at, e.created_at) <= $${idx}`);
    }

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(limit, offset);

    const sql = `
      SELECT id, label, email, "isBulk", "rawStatus", "verifiedAt"
      FROM (
        SELECT
          el.id::text                              AS id,
          COALESCE(el.original_filename, el.name)  AS label,
          NULL::text                               AS email,
          TRUE                                     AS "isBulk",
          el.status::text                          AS "rawStatus",
          COALESCE(el.started_at, el.created_at)   AS "verifiedAt"
        FROM email_lists el
        WHERE ${listConditions.join(' AND ')}

        UNION ALL

        SELECT
          e.id::text                               AS id,
          e.address                                AS label,
          e.address                                AS email,
          FALSE                                    AS "isBulk",
          e.status::text                           AS "rawStatus",
          COALESCE(e.processed_at, e.created_at)   AS "verifiedAt"
        FROM emails e
        WHERE ${emailConditions.join(' AND ')}
      ) AS recent
      ORDER BY "verifiedAt" DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const rows: Array<{
      id: string;
      label: string;
      email: string | null;
      isBulk: boolean;
      rawStatus: string;
      verifiedAt: Date;
    }> = await this.emailsRepo.manager.query(sql, params);

    const countParams = params.slice(0, params.length - 2);
    const countSql = `
      SELECT (
        (SELECT COUNT(*) FROM email_lists el WHERE ${listConditions.join(' AND ')})
        +
        (SELECT COUNT(*) FROM emails e WHERE ${emailConditions.join(' AND ')})
      )::text AS total
    `;
    const totalRows: Array<{ total: string }> =
      await this.emailsRepo.manager.query(countSql, countParams);
    const total = parseInt(totalRows[0]?.total ?? '0', 10);

    const data = rows.map((r) => ({
      id: r.id,
      label: r.label,
      email: r.email,
      isBulk: r.isBulk,
      status: this.toJobStatus(r.rawStatus, r.isBulk),
      verifiedAt: r.verifiedAt,
    }));

    return { data, total, page, limit };
  }

  private statusToList(
    status?: 'queued' | 'pending' | 'completed' | 'failed',
  ): EmailListStatus | null {
    switch (status) {
      case 'queued':
        return EmailListStatus.PENDING;
      case 'pending':
        return EmailListStatus.PROCESSING;
      case 'completed':
        return EmailListStatus.COMPLETED;
      case 'failed':
        return EmailListStatus.FAILED;
      default:
        return null;
    }
  }

  private statusToEmail(
    status?: 'queued' | 'pending' | 'completed' | 'failed',
  ): EmailStatus | null {
    switch (status) {
      case 'queued':
        return EmailStatus.QUEUED;
      case 'pending':
        return EmailStatus.PROCESSING;
      case 'completed':
        return EmailStatus.COMPLETED;
      case 'failed':
        return EmailStatus.FAILED;
      default:
        return null;
    }
  }

  private toJobStatus(
    raw: string,
    isBulk: boolean,
  ): 'queued' | 'pending' | 'completed' | 'failed' {
    if (isBulk) {
      switch (raw as EmailListStatus) {
        case EmailListStatus.PENDING:
          return 'queued';
        case EmailListStatus.PROCESSING:
          return 'pending';
        case EmailListStatus.COMPLETED:
          return 'completed';
        case EmailListStatus.FAILED:
          return 'failed';
        default:
          return 'pending';
      }
    }
    switch (raw as EmailStatus) {
      case EmailStatus.QUEUED:
        return 'queued';
      case EmailStatus.PROCESSING:
        return 'pending';
      case EmailStatus.COMPLETED:
        return 'completed';
      case EmailStatus.FAILED:
        return 'failed';
      default:
        return 'pending';
    }
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
}
