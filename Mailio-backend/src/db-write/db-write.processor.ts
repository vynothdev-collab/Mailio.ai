import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { Job } from 'bullmq';
import { VerificationResult } from '../common/types/verification-result.enum';
import { DlqService } from '../dlq/dlq.service';
import {
  EmailListsService,
  ListDeltas,
} from '../email-lists/email-lists.service';
import { EmailsService } from '../emails/emails.service';
import { MetricsService } from '../metrics/metrics.service';
import { ProgressNotifier } from '../notifications/progress-notifier';
import { ProgressThrottlerService } from '../notifications/progress-throttler.service';
import { VerificationService } from '../verification/verification.service';
import {
  DB_WRITE_QUEUE,
  DbWriteFailureBatchJob,
  DbWriteFailureJob,
  DbWriteJob,
  DbWriteSuccessBatchJob,
  DbWriteSuccessJob,
} from './db-write.types';

@Processor(DB_WRITE_QUEUE, {
  concurrency: parseInt(process.env.DB_WRITE_CONCURRENCY ?? '16', 10),
})
export class DbWriteProcessor extends WorkerHost {
  private readonly logger = new Logger(DbWriteProcessor.name);

  constructor(
    private readonly emailsService: EmailsService,
    private readonly emailListsService: EmailListsService,
    private readonly notifier: ProgressNotifier,
    private readonly throttler: ProgressThrottlerService,
    private readonly verificationService: VerificationService,
    private readonly dlq: DlqService,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<DbWriteJob>, err: Error): Promise<void> {
    const attemptsMade = job.attemptsMade ?? 0;
    const maxAttempts = job.opts?.attempts ?? 1;
    if (attemptsMade < maxAttempts) return;

    this.logger.error(
      `db.write job ${job.id} permanently failed: ${err.message}`,
    );
    try {
      await this.dlq.push({
        sourceQueue: DB_WRITE_QUEUE,
        jobName: job.name,
        userId: job.data.userId ?? null,
        payload: job.data as unknown as Record<string, unknown>,
        errorMessage: err.message,
        attempts: attemptsMade,
      });
      this.metrics?.dlqEntries.labels({ source_queue: DB_WRITE_QUEUE }).inc();
    } catch (e) {
      this.logger.warn(`DLQ push failed: ${(e as Error).message}`);
    }
  }

  async process(job: Job<DbWriteJob>): Promise<void> {
    const data = job.data;
    const startMs = Date.now();
    let outcome: 'ok' | 'error' = 'ok';
    try {
      switch (data.kind) {
        case 'success':
          await this.handleSuccess(data);
          break;
        case 'failure':
          await this.handleFailure(data);
          break;
        case 'success-batch':
          await this.handleSuccessBatch(data);
          break;
        case 'failure-batch':
          await this.handleFailureBatch(data);
          break;
      }
    } catch (e) {
      outcome = 'error';
      throw e;
    } finally {
      this.metrics?.dbWriteDuration
        .labels({ kind: data.kind, outcome })
        .observe((Date.now() - startMs) / 1000);
    }
  }

  private async handleSuccess(d: DbWriteSuccessJob): Promise<void> {
    const transitioned = await this.emailsService.saveResult(d.emailId, {
      verificationResult: d.result,
      score: d.score,
      mxFound: d.mxFound,
      smtpCheck: d.smtpCheck,
      disposable: d.disposable,
      catchAll: d.catchAll,
      freeProvider: d.freeProvider,
      apiRawResponse: d.apiRawResponse,
      durationMs: d.durationMs,
      processedAt: new Date(d.processedAt),
    });

    if (d.listId && transitioned) {
      await this.bumpListAndEmit(d.listId, d.result, d.disposable);
      await this.advanceBulkCursorBy(d.stride ?? 1);
    }

    if (d.isSingleVerify) {
      this.notifier.emitSingleResult(d.userId, {
        emailId: d.emailId,
        address: d.emailAddress,
        result: d.result,
        score: d.score,
        mxFound: d.mxFound,
        smtpCheck: d.smtpCheck,
        disposable: d.disposable,
        durationMs: d.durationMs,
      });
    }
  }

  private async handleFailure(d: DbWriteFailureJob): Promise<void> {
    const transitioned = await this.emailsService.markFailed(
      d.emailId,
      d.errorMessage,
    );

    if (d.listId && transitioned) {
      await this.bumpListAndEmit(d.listId, VerificationResult.UNKNOWN, false);
      await this.advanceBulkCursorBy(d.stride ?? 1);
      this.notifier.emitJobFailed(d.listId, {
        listId: d.listId,
        emailId: d.emailId,
        error: d.errorMessage,
      });
    } else if (!d.listId) {
      this.notifier.emitJobFailed(d.userId, {
        emailId: d.emailId,
        error: d.errorMessage,
      });
    }
  }

  private async bumpListAndEmit(
    listId: string,
    result: VerificationResult,
    disposable: boolean,
  ): Promise<void> {
    try {
      const snap = await this.emailListsService.incrementProcessed(
        listId,
        result,
        disposable,
      );
      this.throttler.schedule(listId, snap);
    } catch (e) {
      this.logger.error(
        `incrementProcessed failed for list ${listId}: ${(e as Error).message}`,
      );
    }
  }

  private async handleSuccessBatch(d: DbWriteSuccessBatchJob): Promise<void> {
    const transitioned = await this.emailsService.saveResultsBatch(d.rows);
    if (transitioned.length === 0) return;

    const byList = new Map<string, ListDeltas>();
    for (const t of transitioned) {
      if (!t.listId) continue;
      const cur = byList.get(t.listId) ?? this.blankDeltas();
      cur.processed++;
      cur[this.resultBucket(t.result)]++;
      if (t.disposable) cur.disposable++;
      byList.set(t.listId, cur);
    }

    for (const [listId, delta] of byList) {
      try {
        const snap = await this.emailListsService.incrementProcessedBatch(
          listId,
          delta,
        );
        this.throttler.schedule(listId, snap);
      } catch (e) {
        this.logger.error(
          `incrementProcessedBatch failed for list ${listId}: ${(e as Error).message}`,
        );
      }
    }

    await this.advanceBulkCursorBy(transitioned.length * (d.stride ?? 1));

    if (d.rows.some((r) => r.isSingleVerify)) {
      const transitionedIds = new Set(transitioned.map((t) => t.emailId));
      for (const r of d.rows) {
        if (!r.isSingleVerify) continue;
        if (!transitionedIds.has(r.emailId)) continue;
        this.notifier.emitSingleResult(d.userId, {
          emailId: r.emailId,
          address: r.emailAddress,
          result: r.result,
          score: r.score,
          mxFound: r.mxFound,
          smtpCheck: r.smtpCheck,
          disposable: r.disposable,
          durationMs: r.durationMs,
        });
        this.metrics?.wsEmits?.labels({ kind: 'single' }).inc();
      }
    }
  }

  private async handleFailureBatch(d: DbWriteFailureBatchJob): Promise<void> {
    const transitioned = await this.emailsService.markFailedBatch(d.rows);
    if (transitioned.length === 0) return;

    const byList = new Map<string, ListDeltas>();
    for (const t of transitioned) {
      if (!t.listId) continue;
      const cur = byList.get(t.listId) ?? this.blankDeltas();
      cur.processed++;
      cur.unknown++;
      byList.set(t.listId, cur);
    }

    for (const [listId, delta] of byList) {
      try {
        const snap = await this.emailListsService.incrementProcessedBatch(
          listId,
          delta,
        );
        this.throttler.schedule(listId, snap);
      } catch (e) {
        this.logger.error(
          `incrementProcessedBatch (failure) failed for list ${listId}: ${(e as Error).message}`,
        );
      }
    }

    await this.advanceBulkCursorBy(transitioned.length * (d.stride ?? 1));

    this.notifier.emitJobFailed(d.listId, {
      listId: d.listId,
      batchId: d.batchId,
      failedCount: transitioned.length,
      error: `${transitioned.length} emails failed in batch ${d.batchId}`,
    });
    this.metrics?.wsEmits?.labels({ kind: 'failed' }).inc();
  }

  private async advanceBulkCursorBy(delta: number): Promise<void> {
    try {
      await this.verificationService.advanceNowServingBy(delta);
    } catch (e) {
      this.logger.warn(
        `advanceNowServingBy(${delta}) failed: ${(e as Error).message}`,
      );
    }
  }

  private blankDeltas(): ListDeltas {
    return {
      processed: 0,
      valid: 0,
      invalid: 0,
      risky: 0,
      unknown: 0,
      disposable: 0,
    };
  }

  private resultBucket(
    r: VerificationResult | null,
  ): 'valid' | 'invalid' | 'risky' | 'unknown' {
    switch (r) {
      case VerificationResult.VALID:
        return 'valid';
      case VerificationResult.INVALID:
        return 'invalid';
      case VerificationResult.RISKY:
        return 'risky';
      default:
        return 'unknown';
    }
  }
}
