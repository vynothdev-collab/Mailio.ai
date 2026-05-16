import { Processor } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Job, RateLimitError, WorkerOptions } from 'bullmq';
import { VerificationResult } from '../common/types/verification-result.enum';
import { DbWriteService } from '../db-write/db-write.service';
import { BatchFailureRow, BatchSuccessRow } from '../db-write/db-write.types';
import { DlqService } from '../dlq/dlq.service';
import { EmailsService } from '../emails/emails.service';
import { ClaimedEmailRow } from '../emails/emails.service';
import { MailTesterResponse } from '../mailtester/interfaces/mailtester-response.interface';
import { MailTesterService } from '../mailtester/mailtester.service';
import { MetricsService } from '../metrics/metrics.service';
import { KeyPoolService } from '../providers/key-pool.service';
import { ProviderError } from '../providers/provider.interface';
import {
  EmailBatchJobPayload,
  EmailVerificationJobPayload,
} from './dto/job-payload.dto';
import { VerificationBaseProcessor } from './verification-base.processor';
import { VERIFY_BULK_QUEUE } from './verification.service';

const MAILTESTER_PROVIDER = 'mailtester';

const RESULT_MAP: Record<string, VerificationResult> = {
  valid: VerificationResult.VALID,
  invalid: VerificationResult.INVALID,
  risky: VerificationResult.RISKY,
  unknown: VerificationResult.UNKNOWN,
};

interface PerEmailSuccess {
  email: ClaimedEmailRow;
  res: MailTesterResponse;
  durationMs: number;
  keyId: string;
}
interface PerEmailFailure {
  email: ClaimedEmailRow;
  err: Error;
}

function createLimiter(max: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = (): void => {
    if (active >= max) return;
    const task = queue.shift();
    if (task) {
      active++;
      task();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = (): void => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      };
      queue.push(run);
      next();
    });
}

@Injectable()
@Processor(VERIFY_BULK_QUEUE, {
  concurrency: parseInt(process.env.VERIFY_BULK_CONCURRENCY ?? '8', 10),
  lockDuration: 60_000,
  stalledInterval: 30_000,
  drainDelay: 5,
} satisfies Pick<
  WorkerOptions,
  'concurrency' | 'lockDuration' | 'stalledInterval' | 'drainDelay'
>)
export class VerificationBulkProcessor extends VerificationBaseProcessor {
  private readonly batchLogger = new Logger(VerificationBulkProcessor.name);
  private readonly innerLimit = createLimiter(
    parseInt(process.env.BATCH_INNER_CONCURRENCY ?? '10', 10),
  );

  constructor(
    emailsService: EmailsService,
    mailTesterService: MailTesterService,
    keyPool: KeyPoolService,
    dbWrite: DbWriteService,
    dlq: DlqService,
    @Optional() metrics?: MetricsService,
  ) {
    super(emailsService, mailTesterService, keyPool, dbWrite, dlq, metrics);
  }

  protected sourceQueueName(): string {
    return VERIFY_BULK_QUEUE;
  }

  async process(
    job: Job<EmailVerificationJobPayload | EmailBatchJobPayload>,
  ): Promise<void> {
    if (job.name === 'verify.batch') {
      return this.processBatch(job as Job<EmailBatchJobPayload>);
    }
    return super.process(job as Job<EmailVerificationJobPayload>);
  }

  private async processBatch(job: Job<EmailBatchJobPayload>): Promise<void> {
    const { batchId, userId, listId, emailIds } = job.data;
    const startMs = Date.now();

    const claimed = await this.emailsService.tryClaimMany(
      emailIds,
      String(job.id),
    );
    if (claimed.length === 0) {
      this.batchLogger.warn(
        `Batch ${batchId} fully already-claimed — skipping (jobId=${job.id})`,
      );
      return;
    }

    const settled = await Promise.allSettled(
      claimed.map((email) =>
        this.innerLimit(() => this.verifyOneForBatch(email)),
      ),
    );

    const successes: PerEmailSuccess[] = [];
    const failures: PerEmailFailure[] = [];
    let rateLimitRetryMs: number | null = null;

    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      const email = claimed[i];
      if (r.status === 'fulfilled') {
        successes.push(r.value);
        continue;
      }
      const err = r.reason as Error;
      failures.push({ email, err });
      if (err instanceof ProviderError && err.kind === 'rate-limit') {
        const ra = err.retryAfterMs ?? 5000;
        rateLimitRetryMs = Math.max(rateLimitRetryMs ?? 0, ra);
      }
    }

    if (successes.length > 0) {
      const rows: BatchSuccessRow[] = successes.map((s) => ({
        emailId: s.email.id,
        emailAddress: s.email.address,
        isSingleVerify: s.email.isSingleVerify,
        providerKeyId: s.keyId,
        result: RESULT_MAP[s.res.result] ?? VerificationResult.UNKNOWN,
        score: s.res.score,
        mxFound: s.res.mx_found,
        smtpCheck: s.res.smtp_check,
        disposable: s.res.disposable,
        catchAll: s.res.catch_all ?? null,
        freeProvider: s.res.free,
        apiRawResponse: s.res.raw as unknown as Record<string, unknown>,
        durationMs: s.durationMs,
        processedAt: new Date().toISOString(),
      }));
      await this.dbWrite.enqueueBatch({
        kind: 'success-batch',
        batchId,
        userId,
        listId,
        rows,
      });
    }

    this.metrics?.batchSize
      ?.labels({ outcome: 'processed' })
      .observe(claimed.length);
    this.metrics?.batchDuration
      ?.labels({ outcome: failures.length === 0 ? 'success' : 'partial' })
      .observe((Date.now() - startMs) / 1000);

    if (failures.length === 0) return;

    if (rateLimitRetryMs !== null) {
      await this.emailsService.releaseClaimMany(
        failures.map((f) => f.email.id),
      );
      this.metrics?.batchPartialFailures
        ?.labels({ reason: 'rate-limit' })
        .inc(failures.length);
      throw new RateLimitError();
    }

    const attemptsMade = (job.attemptsMade ?? 0) + 1;
    const maxAttempts = job.opts?.attempts ?? 1;
    const isFinal = attemptsMade >= maxAttempts;

    if (isFinal) {
      const failRows: BatchFailureRow[] = failures.map((f) => ({
        emailId: f.email.id,
        errorMessage: f.err.message,
      }));
      try {
        await this.dbWrite.enqueueBatch({
          kind: 'failure-batch',
          batchId,
          userId,
          listId,
          rows: failRows,
        });
      } catch (e) {
        this.batchLogger.error(
          `db.write failure-batch enqueue failed for ${batchId}: ${(e as Error).message}`,
        );
      }
      for (const f of failures) {
        try {
          await this.dlq.push({
            sourceQueue: VERIFY_BULK_QUEUE,
            jobName: job.name,
            userId,
            payload: { emailId: f.email.id, listId, batchId },
            errorMessage: f.err.message,
            attempts: attemptsMade,
          });
        } catch (e) {
          this.batchLogger.warn(
            `DLQ push failed for ${f.email.id}: ${(e as Error).message}`,
          );
        }
      }
      this.metrics?.batchPartialFailures
        ?.labels({ reason: 'final' })
        .inc(failures.length);
      return;
    }

    // Non-final: release the failed slice so the BullMQ retry re-claims
    // only them; throw so BullMQ schedules the retry per backoff policy.
    await this.emailsService.releaseClaimMany(failures.map((f) => f.email.id));
    this.metrics?.batchPartialFailures
      ?.labels({ reason: 'retry' })
      .inc(failures.length);
    throw new AggregateError(
      failures.map((f) => f.err),
      `Batch ${batchId}: ${failures.length}/${claimed.length} failed`,
    );
  }

  /** Per-email verification with full KeyPool reporting and metrics. */
  private async verifyOneForBatch(
    email: ClaimedEmailRow,
  ): Promise<PerEmailSuccess> {
    const MAX_ACQUIRE_WAIT_MS = 30_000;
    const waitStart = Date.now();
    let slot = await this.keyPool.acquireKey(MAILTESTER_PROVIDER);
    while (!slot.ok) {
      const snapshot = this.keyPool.getSnapshot(MAILTESTER_PROVIDER);
      if (snapshot.length === 0) {
        throw new ProviderError(
          'rate-limit',
          'KeyPool snapshot is empty — no api_keys configured',
          slot.retryAfterMs,
        );
      }
      if (Date.now() - waitStart >= MAX_ACQUIRE_WAIT_MS) {
        this.batchLogger.warn(
          `KeyPool acquire timeout for ${MAILTESTER_PROVIDER} ` +
            `(email=${email.id}, waited=${Date.now() - waitStart}ms, ` +
            `keysInSnapshot=${snapshot.length})`,
        );
        throw new ProviderError(
          'rate-limit',
          'KeyPool all keys cooled down / rate-limited',
          slot.retryAfterMs,
        );
      }
      const sleepMs = Math.min(slot.retryAfterMs || 50, 1000);
      await new Promise((r) => setTimeout(r, sleepMs));
      slot = await this.keyPool.acquireKey(MAILTESTER_PROVIDER);
    }
    this.batchLogger.debug(
      `→ Ninja verify ${email.address} (keyId=${slot.key.id})`,
    );
    const start = Date.now();
    try {
      const res = await this.mailTesterService.verify(
        email.address,
        slot.key.keyValue,
      );
      void this.keyPool.reportSuccess(slot.key.id);
      this.metrics?.providerRequests
        .labels({
          provider: MAILTESTER_PROVIDER,
          key_id: slot.key.id,
          outcome: 'success',
        })
        .inc();
      this.metrics?.providerDuration
        .labels({ provider: MAILTESTER_PROVIDER, outcome: 'success' })
        .observe((Date.now() - start) / 1000);
      return {
        email,
        res,
        durationMs: Date.now() - start,
        keyId: slot.key.id,
      };
    } catch (e) {
      const kind = e instanceof ProviderError ? e.kind : 'server';
      this.metrics?.providerRequests
        .labels({
          provider: MAILTESTER_PROVIDER,
          key_id: slot.key.id,
          outcome: kind,
        })
        .inc();
      if (e instanceof ProviderError) {
        await this.keyPool.reportFailure(
          slot.key.id,
          e.kind,
          e.message,
          e.retryAfterMs,
        );
      } else {
        await this.keyPool.reportFailure(
          slot.key.id,
          'server',
          (e as Error).message,
        );
      }
      throw e;
    }
  }
}
