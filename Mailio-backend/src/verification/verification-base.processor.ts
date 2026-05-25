import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { Job, RateLimitError } from 'bullmq';
import { VerificationResult } from '../common/types/verification-result.enum';
import { DbWriteService } from '../db-write/db-write.service';
import { DlqService } from '../dlq/dlq.service';
import { EmailsService } from '../emails/emails.service';
import { MailTesterResponse } from '../mailtester/interfaces/mailtester-response.interface';
import { MailTesterService } from '../mailtester/mailtester.service';
import { MetricsService } from '../metrics/metrics.service';
import { KeyPoolService } from '../providers/key-pool.service';
import { ProviderError } from '../providers/provider.interface';
import { EmailVerificationJobPayload } from './dto/job-payload.dto';

const RESULT_MAP: Record<string, VerificationResult> = {
  valid: VerificationResult.VALID,
  invalid: VerificationResult.INVALID,
  risky: VerificationResult.RISKY,
  unknown: VerificationResult.UNKNOWN,
};

const MAILTESTER_PROVIDER = 'mailtester';

export abstract class VerificationBaseProcessor extends WorkerHost {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly emailsService: EmailsService,
    protected readonly mailTesterService: MailTesterService,
    protected readonly keyPool: KeyPoolService,
    protected readonly dbWrite: DbWriteService,
    protected readonly dlq: DlqService,
    @Optional() protected readonly metrics?: MetricsService,
  ) {
    super();
  }

  protected abstract sourceQueueName(): string;

  private recordProviderOutcome(
    keyId: string,
    outcome: string,
    startMs: number,
  ): void {
    if (!this.metrics) return;
    this.metrics.providerRequests
      .labels({ provider: MAILTESTER_PROVIDER, key_id: keyId, outcome })
      .inc();
    this.metrics.providerDuration
      .labels({ provider: MAILTESTER_PROVIDER, outcome })
      .observe((Date.now() - startMs) / 1000);
  }

  async process(job: Job<EmailVerificationJobPayload>): Promise<void> {
    const { emailId, userId, listId, stride } = job.data;

    const email = await this.emailsService.tryClaim(emailId, String(job.id));
    if (!email) {
      this.logger.warn(
        `Email ${emailId} already claimed — skipping job ${job.id}`,
      );
      return;
    }

    const slot = await this.keyPool.acquireKey(MAILTESTER_PROVIDER);
    if (!slot.ok) {
      const snapshot = this.keyPool.getSnapshot(MAILTESTER_PROVIDER);
      this.logger.warn(
        `KeyPool denied acquire for ${MAILTESTER_PROVIDER} ` +
          `(email=${emailId}, retryAfterMs=${slot.retryAfterMs}, ` +
          `keysInSnapshot=${snapshot.length}). ` +
          `Releasing claim and deferring job.`,
      );
      await this.emailsService.releaseClaim(emailId);
      await this.worker.rateLimit(slot.retryAfterMs);
      throw new RateLimitError();
    }
    this.logger.debug(
      `→ Ninja verify ${email.address} (jobId=${job.id}, keyId=${slot.key.id})`,
    );

    const startMs = Date.now();
    let apiRes: MailTesterResponse;
    try {
      apiRes = await this.mailTesterService.verify(
        email.address,
        slot.key.keyValue,
      );
      void this.keyPool.reportSuccess(slot.key.id);
      this.recordProviderOutcome(slot.key.id, 'success', startMs);
    } catch (e) {
      const kind = e instanceof ProviderError ? e.kind : 'server';
      const httpStatus = e instanceof ProviderError ? e.httpStatus : undefined;
      this.recordProviderOutcome(slot.key.id, kind, startMs);

      const msg = (e as Error).message;
      this.logger.warn(
        `Ninja verify FAILED ${email.address} ` +
          `(kind=${kind}${httpStatus !== undefined ? `, http=${httpStatus}` : ''}, ` +
          `keyId=${slot.key.id}, attempt=${job.attemptsMade ?? 0}/${job.opts?.attempts ?? 1}): ${msg}`,
      );

      if (e instanceof ProviderError) {
        await this.keyPool.reportFailure(
          slot.key.id,
          e.kind,
          e.message,
          e.retryAfterMs,
        );
        if (e.kind === 'rate-limit') {
          await this.emailsService.releaseClaim(emailId);
          await this.worker.rateLimit(e.retryAfterMs ?? 5000);
          throw new RateLimitError();
        }
      } else {
        await this.keyPool.reportFailure(
          slot.key.id,
          'server',
          (e as Error).message,
        );
      }
      throw e;
    }
    const durationMs = Date.now() - startMs;
    const result = RESULT_MAP[apiRes.result] ?? VerificationResult.UNKNOWN;

    await this.dbWrite.enqueue({
      kind: 'success',
      emailId,
      userId,
      listId: listId ?? null,
      isSingleVerify: email.isSingleVerify,
      stride,
      providerKeyId: slot.key.id,
      result,
      score: apiRes.score,
      mxFound: apiRes.mx_found,
      smtpCheck: apiRes.smtp_check,
      disposable: apiRes.disposable,
      catchAll: apiRes.catch_all ?? null,
      freeProvider: apiRes.free,
      apiRawResponse: apiRes.raw as unknown as Record<string, unknown>,
      durationMs,
      processedAt: new Date().toISOString(),
      emailAddress: email.address,
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<EmailVerificationJobPayload>,
    err: Error,
  ): Promise<void> {
    const { emailId, userId, listId, stride } = job.data;
    const attemptsMade = job.attemptsMade ?? 0;
    const maxAttempts = job.opts?.attempts ?? 1;
    const isFinal = attemptsMade >= maxAttempts;

    if (!isFinal) {
      this.logger.warn(
        `Job ${job.id} attempt ${attemptsMade}/${maxAttempts} failed (will retry): ${err.message}`,
      );
      return;
    }

    this.logger.error(
      `Job ${job.id} permanently failed for email ${emailId}: ${err.message}`,
    );

    try {
      await this.dbWrite.enqueue({
        kind: 'failure',
        emailId,
        userId,
        listId: listId ?? null,
        isSingleVerify: false,
        errorMessage: err.message,
        stride,
      });
    } catch (e) {
      this.logger.error(
        `Failed to enqueue db.write failure for ${emailId}: ${(e as Error).message}`,
      );
    }

    try {
      await this.dlq.push({
        sourceQueue: this.sourceQueueName(),
        jobName: job.name,
        userId,
        payload: job.data as unknown as Record<string, unknown>,
        errorMessage: err.message,
        attempts: attemptsMade,
      });
      this.metrics?.dlqEntries
        .labels({ source_queue: this.sourceQueueName() })
        .inc();
    } catch (e) {
      this.logger.warn(
        `DLQ push failed for ${emailId}: ${(e as Error).message}`,
      );
    }
  }
}
