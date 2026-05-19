import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { VerificationResult } from '../../common/types/verification-result.enum';
import { Email, EmailStatus } from '../../emails/entities/email.entity';
import { MailTesterService } from '../../mailtester/mailtester.service';

export interface CheckItem {
  key: string;
  label: string;
  value: string;
  status: 'pass' | 'fail' | 'info';
}

const RESULT_MAP: Record<string, VerificationResult> = {
  valid: VerificationResult.VALID,
  invalid: VerificationResult.INVALID,
  risky: VerificationResult.RISKY,
  unknown: VerificationResult.UNKNOWN,
};

const DESCRIPTIONS: Record<VerificationResult, string> = {
  [VerificationResult.VALID]: 'Email address is valid and accepting mail',
  [VerificationResult.INVALID]: 'Email address is invalid or does not exist',
  [VerificationResult.RISKY]: 'Email address may be risky or unreliable',
  [VerificationResult.UNKNOWN]: 'Email address could not be fully verified',
};

@Injectable()
export class SingleVerifyService {
  constructor(
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
    private readonly mailTesterService: MailTesterService,
  ) {}

  async verifySingle(address: string, userId: string) {
    const startMs = Date.now();
    const apiRes = await this.mailTesterService.verify(address);
    const durationMs = Date.now() - startMs;

    const result = RESULT_MAP[apiRes.result] ?? VerificationResult.UNKNOWN;

    const email = await this.emailsRepo.save(
      this.emailsRepo.create({
        address,
        userId,
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

    return {
      id: email.id,
      email: address,
      status: result.toLowerCase(),
      confidence: this.calcConfidence(result, apiRes.score),
      description: DESCRIPTIONS[result],
      verifiedAt: email.processedAt,
      durationMs,
      checks: this.buildChecks(apiRes),
    };
  }

  async getRecent(userId: string, page: number, limit: number) {
    const [rows, total] = await this.emailsRepo.findAndCount({
      where: { userId, isSingleVerify: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = rows.map((e) => ({
      id: e.id,
      email: e.address,
      status: e.verificationResult?.toLowerCase() ?? 'unknown',
      risk: this.toRisk(e.verificationResult),
      verifiedAt: e.processedAt ?? e.createdAt,
    }));

    return { data, total, page, limit };
  }

  async getStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [todayRows, yesterdayRows, allRows] = await Promise.all([
      this.emailsRepo.find({
        where: {
          userId,
          isSingleVerify: true,
          createdAt: Between(today, new Date()),
        },
        select: ['id', 'verificationResult', 'durationMs'],
      }),
      this.emailsRepo.find({
        where: {
          userId,
          isSingleVerify: true,
          createdAt: Between(yesterday, today),
        },
        select: ['id', 'verificationResult', 'durationMs'],
      }),
      this.emailsRepo.find({
        where: { userId, isSingleVerify: true },
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
    const riskyAll = allRows.filter(
      (e) => e.verificationResult === VerificationResult.RISKY,
    ).length;

    const pct = (n: number) =>
      allRows.length > 0 ? Math.round((n / allRows.length) * 1000) / 10 : 0;

    const successRate = pct(validAll);
    const invalidRate = pct(invalidAll);
    const riskRate = pct(riskyAll);

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
      riskRate,
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
    const email = await this.emailsRepo.findOne({ where: { id, userId } });
    if (!email) throw new Error('Not found');

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

  private calcConfidence(result: VerificationResult, score: number): number {
    if (result === VerificationResult.VALID) return Math.max(score, 80);
    if (result === VerificationResult.RISKY) return Math.min(score, 60);
    if (result === VerificationResult.INVALID) return Math.min(score, 20);
    return score ?? 0;
  }

  private toRisk(result: VerificationResult | null): string {
    if (result === VerificationResult.VALID) return 'low';
    if (result === VerificationResult.RISKY) return 'medium';
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
