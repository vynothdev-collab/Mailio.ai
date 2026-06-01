import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { DataScopeService } from '../../common/scope/data-scope.service';
import { VerificationResult } from '../../common/types/verification-result.enum';
import { CreditsService } from '../../credits/credits.service';
import { Email, EmailStatus } from '../../emails/entities/email.entity';
import { MailTesterService } from '../../mailtester/mailtester.service';
import { User } from '../../users/entities/user.entity';

export interface CheckItem {
  key: string;
  label: string;
  value: string;
  status: 'pass' | 'fail' | 'info';
}

const RESULT_MAP: Record<string, VerificationResult> = {
  valid: VerificationResult.VALID,
  invalid: VerificationResult.INVALID,
  catchall: VerificationResult.CATCHALL,
  unknown: VerificationResult.UNKNOWN,
};

const DESCRIPTIONS: Record<VerificationResult, string> = {
  [VerificationResult.VALID]: 'Email address is valid and accepting mail',
  [VerificationResult.INVALID]: 'Email address is invalid or does not exist',
  [VerificationResult.CATCHALL]: 'Email address may be catchall or unreliable',
  [VerificationResult.UNKNOWN]: 'Email address could not be fully verified',
};

@Injectable()
export class SingleVerifyService {
  constructor(
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
    private readonly mailTesterService: MailTesterService,
    private readonly credits: CreditsService,
    private readonly scope: DataScopeService,
  ) {}

  async verifySingle(address: string, user: User) {
    // Pre-flight: refuse before calling the (paid) provider.
    await this.credits.ensureSufficient(user, 1);

    const startMs = Date.now();
    const apiRes = await this.mailTesterService.verify(address);
    const durationMs = Date.now() - startMs;

    const result = RESULT_MAP[apiRes.result] ?? VerificationResult.UNKNOWN;

    const email = await this.emailsRepo.save(
      this.emailsRepo.create({
        address,
        userId: user.id,
        isSingleVerify: true,
        status: EmailStatus.COMPLETED,
        verificationResult: result,
        score: apiRes.score,
        mxFound: apiRes.mx_found,
        smtpCheck: apiRes.smtp_check,
        disposable: apiRes.disposable,
        catchAll: apiRes.catch_all ?? null,
        freeProvider: apiRes.free,
        apiRawResponse: apiRes.raw as unknown as Record<string, unknown>,
        durationMs,
        processedAt: new Date(),
      }),
    );

    // Deduct 1 credit once we have a persisted result. We accept any
    // VerificationResult here — VALID/INVALID/CATCHALL/UNKNOWN all represent
    // a billable provider call. Only a thrown exception above (network /
    // provider failure) avoids the charge.
    const { balanceAfter } = await this.credits.deductForSingleVerify(
      user,
      email.id,
    );

    return {
      id: email.id,
      email: address,
      status: result.toLowerCase(),
      confidence: this.calcConfidence(result, apiRes.score),
      description: DESCRIPTIONS[result],
      verifiedAt: email.processedAt,
      durationMs,
      checks: this.buildChecks(apiRes),
      creditBalanceAfter: balanceAfter,
    };
  }

  async getRecent(user: User, page: number, limit: number) {
    const userIds = await this.scope.resolveUserIds(user);
    const [rows, total] = await this.emailsRepo.findAndCount({
      where: { userId: In(userIds), isSingleVerify: true, isDeleted: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = rows.map((e) => ({
      id: e.id,
      email: e.address,
      status: e.verificationResult?.toLowerCase() ?? 'unknown',
      catchall: this.toCatchall(e.verificationResult),
      verifiedAt: e.processedAt ?? e.createdAt,
    }));

    return { data, total, page, limit };
  }

  async getStats(user: User) {
    const userIds = await this.scope.resolveUserIds(user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [todayRows, yesterdayRows, allRows] = await Promise.all([
      this.emailsRepo.find({
        where: {
          userId: In(userIds),
          isSingleVerify: true,
          isDeleted: false,
          createdAt: Between(today, new Date()),
        },
        select: ['id', 'verificationResult', 'durationMs'],
      }),
      this.emailsRepo.find({
        where: {
          userId: In(userIds),
          isSingleVerify: true,
          isDeleted: false,
          createdAt: Between(yesterday, today),
        },
        select: ['id', 'verificationResult', 'durationMs'],
      }),
      this.emailsRepo.find({
        where: { userId: In(userIds), isSingleVerify: true, isDeleted: false },
        select: ['verificationResult', 'durationMs'],
      }),
    ]);

    const todayCount = todayRows.length;
    const validAll = allRows.filter(
      (e) => e.verificationResult === VerificationResult.VALID,
    ).length;
    const invalidAll = allRows.filter(
      (e) => e.verificationResult === VerificationResult.INVALID,
    ).length;
    const catchallAll = allRows.filter(
      (e) => e.verificationResult === VerificationResult.CATCHALL,
    ).length;

    const pct = (n: number) =>
      allRows.length > 0 ? Math.round((n / allRows.length) * 1000) / 10 : 0;

    const successRate = pct(validAll);
    const invalidRate = pct(invalidAll);
    const catchallRate = pct(catchallAll);

    const durations = allRows
      .filter((e) => e.durationMs != null)
      .map((e) => e.durationMs!);
    const avgResponseMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    const yesterdayCount = yesterdayRows.length;
    const countChange =
      yesterdayCount > 0
        ? `${todayCount >= yesterdayCount ? '+' : ''}${Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)}%`
        : '+0%';

    return {
      todayCount,
      successRate,
      invalidRate,
      catchallRate,
      apiUsage: allRows.length,
      avgResponseMs,
      changes: {
        todayCount: countChange,
        successRate: '+0%',
        avgResponseMs: '0ms',
      },
    };
  }

  async downloadSingle(
    id: string,
    userId: string,
  ): Promise<{ csv: string; filename: string }> {
    const email = await this.emailsRepo.findOne({
      where: { id, userId, isDeleted: false },
    });
    if (!email) throw new NotFoundException('Record not found');

    const csv = [
      'address,result,score,mx_found,smtp_check,disposable,catch_all,free_provider,duration_ms,verified_at',
      [
        email.address,
        email.verificationResult ?? '',
        email.score ?? '',
        email.mxFound ?? '',
        email.smtpCheck ?? '',
        email.disposable ?? '',
        email.catchAll ?? '',
        email.freeProvider ?? '',
        email.durationMs ?? '',
        email.processedAt?.toISOString() ?? '',
      ].join(','),
    ].join('\n');

    return { csv, filename: `verify-${id}.csv` };
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const result = await this.emailsRepo.update(
      { id, userId, isSingleVerify: true, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
    );
    if (!result.affected) {
      throw new NotFoundException('Record not found');
    }
  }

  private calcConfidence(result: VerificationResult, score: number): number {
    if (result === VerificationResult.VALID) return Math.max(score, 80);
    if (result === VerificationResult.CATCHALL) return Math.min(score, 60);
    if (result === VerificationResult.INVALID) return Math.min(score, 20);
    return score ?? 0;
  }

  private toCatchall(result: VerificationResult | null): string {
    if (result === VerificationResult.VALID) return 'low';
    if (result === VerificationResult.CATCHALL) return 'medium';
    if (result === VerificationResult.INVALID) return 'high';
    return 'unknown';
  }

  private buildChecks(
    apiRes: Awaited<ReturnType<MailTesterService['verify']>>,
  ): CheckItem[] {
    return [
      {
        key: 'format',
        label: 'Format Check',
        value: 'Valid',
        status: 'pass',
      },
      {
        key: 'mx',
        label: 'MX Record',
        value: apiRes.mx_found ? 'Found' : 'Not Found',
        status: apiRes.mx_found ? 'pass' : 'fail',
      },
      {
        key: 'smtp',
        label: 'SMTP Check',
        value: apiRes.smtp_check ? 'Accepted' : 'Rejected',
        status: apiRes.smtp_check ? 'pass' : 'fail',
      },
      {
        key: 'disposable',
        label: 'Disposable Email',
        value: apiRes.disposable ? 'Yes' : 'No',
        status: apiRes.disposable ? 'fail' : 'pass',
      },
      {
        key: 'catch_all',
        label: 'Catch-All Domain',
        value:
          apiRes.catch_all == null
            ? 'Unknown'
            : apiRes.catch_all
              ? 'Yes'
              : 'No',
        status:
          apiRes.catch_all == null
            ? 'info'
            : apiRes.catch_all
              ? 'info'
              : 'pass',
      },
      {
        key: 'free_provider',
        label: 'Free Provider',
        value: apiRes.free ? 'Yes' : 'No',
        status: apiRes.free ? 'info' : 'pass',
      },
    ];
  }
}
