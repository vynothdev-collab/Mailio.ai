import { Processor } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Job, RateLimitError, WorkerOptions } from 'bullmq';
import { VerificationResult } from '../common/types/verification-result.enum';
import { DbWriteService } from '../db-write/db-write.service';
import { BatchFailureRow } from '../db-write/db-write.types';
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
  lockDuration: 300_000,
  stalledInterval: 60_000,
  drainDelay: 5,
} satisfies Pick<
  WorkerOptions,
  'concurrency' | 'lockDuration' | 'stalledInterval' | 'drainDelay'
>)
export class VerificationBulkProcessor extends VerificationBaseProcessor {
  private readonly batchLogger = new Logger(VerificationBulkProcessor.name);

  private readonly perBatchConcurrency = (() => {
    const raw = parseInt(process.env.BATCH_INNER_CONCURRENCY ?? '57', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 57;
  })();

  // Interval between successive HTTP dispatch starts (matches token-bucket refill rate).
  // Staggering the initial burst prevents sending 57+ simultaneous requests to the
  // API which triggers 429 with a large Retry-After, causing multi-second stalls.
  private readonly dispatchIntervalMs = Math.ceil(
    parseInt(process.env.MAILTESTER_RATE_WINDOW_MS ?? '10000', 10) /
      Math.max(1, parseInt(process.env.MAILTESTER_RATE_LIMIT ?? '228', 10)),
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
    this.batchLogger.log(
      `VerificationBulkProcessor started ` +
        `(workerConcurrency=${process.env.VERIFY_BULK_CONCURRENCY ?? '8'}, ` +
        `perBatchConcurrency=${this.perBatchConcurrency}, ` +
        `batchSize=${process.env.BULK_BATCH_SIZE ?? '228'})`,
    );
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
    const { batchId, userId, listId, emailIds, stride } = job.data;
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

    const batchLimit = createLimiter(this.perBatchConcurrency);

    const settled = await Promise.allSettled(
      claimed.map((email, i) =>
        batchLimit(async () => {
          // Stagger the first perBatchConcurrency emails so they start HTTP
          // calls at dispatchIntervalMs apart (~44ms) instead of simultaneously.
          // Without this, 57+ requests hit the API at once → 429 Retry-After N
          // → all verifications stall for N seconds.  After the initial window
          // the natural pipeline cadence (slots free as HTTP calls complete)
          // maintains the correct spacing automatically.
          if (i < this.perBatchConcurrency) {
            await new Promise<void>((r) =>
              setTimeout(r, i * this.dispatchIntervalMs),
            );
          }
          return this.verifyOneForBatch(email).then((success) =>
            this.flushSuccessStream(success, userId, listId, stride).then(
              () => success,
            ),
          );
        }),
      ),
    );

    const failures: PerEmailFailure[] = [];
    let rateLimitRetryMs: number | null = null;
    let hasRetryableInfra = false;

    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      const email = claimed[i];
      if (r.status === 'fulfilled') continue;
      const err = r.reason as Error;
      failures.push({ email, err });
      if (err instanceof ProviderError) {
        if (err.kind === 'rate-limit') {
          const ra = err.retryAfterMs ?? 5000;
          rateLimitRetryMs = Math.max(rateLimitRetryMs ?? 0, ra);
        } else if (err.kind === 'server') {
          hasRetryableInfra = true;
        }
      } else {
        hasRetryableInfra = true;
      }
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
    const isFinal = attemptsMade >= maxAttempts || !hasRetryableInfra;

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
          stride,
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

    await this.emailsService.releaseClaimMany(failures.map((f) => f.email.id));
    this.metrics?.batchPartialFailures
      ?.labels({ reason: 'retry' })
      .inc(failures.length);
    throw new AggregateError(
      failures.map((f) => f.err),
      `Batch ${batchId}: ${failures.length}/${claimed.length} failed`,
    );
  }

  private async flushSuccessStream(
    s: PerEmailSuccess,
    userId: string,
    listId: string,
    stride: number | undefined,
  ): Promise<void> {
    // No try-catch here — if enqueue throws (e.g. Redis down), the error
    // propagates to Promise.allSettled in processBatch, the email appears in
    // `failures`, releaseClaimMany resets it to QUEUED, and BullMQ retries the
    // batch job. Silent catch would leave the email stuck in PROCESSING forever.
    await this.dbWrite.enqueue({
      kind: 'success',
      emailId: s.email.id,
      userId,
      listId: listId ?? null,
      isSingleVerify: s.email.isSingleVerify,
      stride,
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
      emailAddress: s.email.address,
    });
  }

  private async verifyOneForBatch(
    email: ClaimedEmailRow,
  ): Promise<PerEmailSuccess> {
    if (!email || !email.address || typeof email.address !== 'string') {
      throw new ProviderError(
        'bad-request',
        `Skipping email with missing address (id=${email?.id ?? 'unknown'})`,
      );
    }
    const MAX_ACQUIRE_WAIT_MS = parseInt(
      process.env.KEY_ACQUIRE_MAX_WAIT_MS ?? '120000',
      10,
    );
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
      // Sleep for the actual token-bucket retryAfterMs (~44ms at 228/10s)
      // plus small jitter to spread concurrent retries.
      const sleepMs =
        Math.max(slot.retryAfterMs || 44, 10) + Math.floor(Math.random() * 50);
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
