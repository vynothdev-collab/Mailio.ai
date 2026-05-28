import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CsvParseService } from '../../csv-parse/csv-parse.service';
import { EmailListsService } from '../../email-lists/email-lists.service';
import {
  EmailList,
  EmailListParseStatus,
  EmailListStatus,
} from '../../email-lists/entities/email-list.entity';
import { Email, EmailStatus } from '../../emails/entities/email.entity';
import { VerificationResult } from '../../common/types/verification-result.enum';
import { User } from '../../users/entities/user.entity';
import { VerificationService } from '../../verification/verification.service';

const CHART_COLORS = {
  valid: '#22c55e',
  invalid: '#ef4444',
  risky: '#f59e0b',
  disposable: '#8b5cf6',
};

@Injectable()
export class BulkVerifyService {
  constructor(
    @InjectRepository(EmailList)
    private readonly listsRepo: Repository<EmailList>,
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
    private readonly emailListsService: EmailListsService,
    private readonly verificationService: VerificationService,
    private readonly csvParse: CsvParseService,
  ) {}

  async upload(user: User, filePath: string, originalFilename: string) {
    const name = originalFilename.replace(/\.[^.]+$/, '');

    const list = await this.listsRepo.save(
      this.listsRepo.create({
        userId: user.id,
        name,
        originalFilename,
        status: EmailListStatus.PENDING,
        parseStatus: EmailListParseStatus.PENDING,
        totalCount: 0,
      }),
    );

    await this.csvParse.enqueue({
      listId: list.id,
      userId: user.id,
      plan: user.plan,
      filePath,
      originalFilename,
    });

    return {
      jobId: list.id,
      fileName: originalFilename,
      parseStatus: list.parseStatus,
      status: list.status,
    };
  }

  async getActive(userId: string) {
    const list = await this.emailListsService.findActiveJob(userId);
    if (!list) return null;
    return this.toActiveJob(list);
  }

  async getProgress(jobId: string, userId: string) {
    const list = await this.emailListsService.findById(jobId, userId);
    const etaSeconds = this.calcEta(list);

    return {
      progress:
        list.totalCount > 0
          ? Math.round((list.processedCount / list.totalCount) * 100)
          : 0,
      processedCount: list.processedCount,
      totalCount: list.totalCount,
      etaSeconds,
      valid: list.validCount,
      invalid: list.invalidCount,
      risky: list.riskyCount + list.unknownCount,
      disposable: list.disposableCount,
    };
  }

  async getJobs(userId: string, page: number, limit: number, status?: string) {
    const statusFilter =
      status && status !== 'all'
        ? (status.toUpperCase() as EmailListStatus)
        : undefined;

    const [items, total] = await this.emailListsService.findByUser(
      userId,
      page,
      limit,
      statusFilter,
    );

    const data = items.map((l) => ({
      jobId: l.id,
      fileName: l.originalFilename ?? l.name,
      status: l.status.toLowerCase(),
      totalEmails: l.totalCount,
      processedCount: l.processedCount,
      valid: l.validCount,
      invalid: l.invalidCount,
      risky: l.riskyCount + l.unknownCount,
      disposable: l.disposableCount,
      createdAt: l.createdAt,
      completedAt: l.status === EmailListStatus.COMPLETED ? l.updatedAt : null,
    }));

    return { data, total, page, limit };
  }

  async getStats(userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const allLists = await this.listsRepo.find({
      where: { userId, isDeleted: false },
      select: ['id', 'status', 'totalCount', 'processedCount', 'createdAt'],
    });

    const todayLists = allLists.filter((l) => l.createdAt >= startOfToday);
    const yesterdayLists = allLists.filter(
      (l) => l.createdAt >= startOfYesterday && l.createdAt < startOfToday,
    );

    const completedJobs = allLists.filter(
      (l) => l.status === EmailListStatus.COMPLETED,
    ).length;
    const completedYesterday = yesterdayLists.filter(
      (l) => l.status === EmailListStatus.COMPLETED,
    ).length;

    const activeList = await this.emailListsService.findActiveJob(userId);

    const [todayEmails, yesterdayEmails, allEmails] = await Promise.all([
      this.emailsRepo.find({
        where: {
          userId,
          isSingleVerify: false,
          isDeleted: false,
          createdAt: Between(startOfToday, new Date()),
        },
        select: ['durationMs'],
      }),
      this.emailsRepo.find({
        where: {
          userId,
          isSingleVerify: false,
          isDeleted: false,
          createdAt: Between(startOfYesterday, startOfToday),
        },
        select: ['durationMs'],
      }),
      this.emailsRepo.find({
        where: { userId, isSingleVerify: false, isDeleted: false },
        select: ['durationMs', 'verificationResult'],
      }),
    ]);

    const avgMs = (rows: { durationMs: number | null }[]): number => {
      const ds = rows
        .map((r) => r.durationMs)
        .filter((d): d is number => d != null);
      return ds.length > 0
        ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length)
        : 0;
    };

    const avgResponseMs = avgMs(allEmails);
    const avgResponseToday = avgMs(todayEmails);
    const avgResponseYday = avgMs(yesterdayEmails);

    const successCount = allEmails.filter(
      (e) => e.verificationResult === VerificationResult.VALID,
    ).length;
    const invalidCount = allEmails.filter(
      (e) => e.verificationResult === VerificationResult.INVALID,
    ).length;
    const riskCount = allEmails.filter(
      (e) => e.verificationResult === VerificationResult.RISKY,
    ).length;

    return {
      filesToday: todayLists.length,
      currentJobEmails: activeList?.totalCount ?? 0,
      completedJobs,
      apiUsage: allEmails.length,
      avgResponseMs,
      successCount,
      invalidCount,
      riskCount,
      changes: {
        filesToday: this.pctChange(todayLists.length, yesterdayLists.length),
        completedJobs: this.pctChange(completedJobs, completedYesterday),
        avgResponseMs: this.msDelta(avgResponseToday, avgResponseYday),
      },
    };
  }

  private pctChange(current: number, previous: number): string {
    if (previous === 0) {
      return current > 0 ? '+100%' : '+0%';
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    return `${pct >= 0 ? '+' : ''}${pct}%`;
  }

  private msDelta(current: number, previous: number): string {
    const delta = current - previous;
    return `${delta >= 0 ? '+' : ''}${delta}ms`;
  }

  async getAggregateBreakdown(userId: string) {
    const rows = await this.emailsRepo.find({
      where: { userId, isSingleVerify: false, isDeleted: false },
      select: ['verificationResult'],
    });

    let valid = 0;
    let invalid = 0;
    let risky = 0;
    for (const r of rows) {
      if (r.verificationResult === VerificationResult.VALID) valid++;
      else if (r.verificationResult === VerificationResult.INVALID) invalid++;
      else risky++;
    }

    const total = valid + invalid + risky;
    const pct = (n: number) =>
      total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

    return {
      total,
      data: [
        {
          name: 'Valid',
          value: valid,
          percentage: pct(valid),
          color: CHART_COLORS.valid,
        },
        {
          name: 'Invalid',
          value: invalid,
          percentage: pct(invalid),
          color: CHART_COLORS.invalid,
        },
        {
          name: 'Risky',
          value: risky,
          percentage: pct(risky),
          color: CHART_COLORS.risky,
        },
      ],
    };
  }

  async getBreakdown(jobId: string, userId: string) {
    const list = await this.emailListsService.findById(jobId, userId);
    const total = list.processedCount;

    const pct = (n: number) =>
      total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

    return {
      data: [
        {
          name: 'Valid',
          value: list.validCount,
          percentage: pct(list.validCount),
          color: CHART_COLORS.valid,
        },
        {
          name: 'Invalid',
          value: list.invalidCount,
          percentage: pct(list.invalidCount),
          color: CHART_COLORS.invalid,
        },
        {
          name: 'Risky',
          value: list.riskyCount + list.unknownCount,
          percentage: pct(list.riskyCount + list.unknownCount),
          color: CHART_COLORS.risky,
        },
        {
          name: 'Disposable',
          value: list.disposableCount,
          percentage: pct(list.disposableCount),
          color: CHART_COLORS.disposable,
        },
      ],
      total,
    };
  }

  async streamDownload(
    jobId: string,
    userId: string,
    res: import('express').Response,
    format: 'csv' | 'json',
    type: 'verified' | 'full',
  ) {
    return this.emailListsService.streamDownload(
      jobId,
      userId,
      res,
      format,
      type,
    );
  }

  async retry(jobId: string, userId: string) {
    const { requeuedCount } = await this.emailListsService.retryFailed(
      jobId,
      userId,
    );

    if (requeuedCount > 0) {
      const failedEmails = await this.emailsRepo.find({
        where: { listId: jobId, status: EmailStatus.QUEUED },
        select: ['id'],
      });
      const list = await this.emailListsService.findById(jobId, userId);
      if (process.env.BULK_BATCH_ENABLED === 'true') {
        await this.verificationService.enqueueBulkBatches(
          failedEmails.map((e) => e.id),
          userId,
          jobId,
          undefined,
          list.totalCount ?? failedEmails.length,
        );
      } else {
        await this.verificationService.enqueueBulk(
          failedEmails.map((e) => e.id),
          userId,
          jobId,
          list.totalCount ?? failedEmails.length,
        );
      }
    }

    return { jobId, status: 'queued', requeuedCount };
  }

  async softDeleteJob(jobId: string, userId: string): Promise<void> {
    const now = new Date();
    const result = await this.listsRepo.update(
      { id: jobId, userId, isDeleted: false },
      { isDeleted: true, deletedAt: now },
    );
    if (!result.affected) {
      throw new NotFoundException('Record not found');
    }
    // Cascade: hide all child emails belonging to this list from list/stat APIs.
    await this.emailsRepo.update(
      { listId: jobId, userId, isDeleted: false },
      { isDeleted: true, deletedAt: now },
    );
  }

  private toActiveJob(list: EmailList) {
    return {
      jobId: list.id,
      fileName: list.originalFilename ?? list.name,
      progress:
        list.totalCount > 0
          ? Math.round((list.processedCount / list.totalCount) * 100)
          : 0,
      processedCount: list.processedCount,
      totalCount: list.totalCount,
      etaSeconds: this.calcEta(list),
      startedAt: list.startedAt,
      valid: list.validCount,
      invalid: list.invalidCount,
      risky: list.riskyCount + list.unknownCount,
      disposable: list.disposableCount,
    };
  }

  private calcEta(list: EmailList): number {
    const remaining = list.totalCount - list.processedCount;
    if (remaining <= 0) return 0;
    if (list.startedAt && list.processedCount > 0) {
      const elapsedSec = (Date.now() - list.startedAt.getTime()) / 1000;
      const rate = list.processedCount / elapsedSec;
      if (rate > 0) return Math.round(remaining / rate);
    }
    return Math.round(remaining / 1.1);
  }
}
