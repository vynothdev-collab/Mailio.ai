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

/**
 * Persists verification outcomes and fans out progress notifications.
 *
 * Runs in the same worker process as VerificationProcessor today; it could
 * be moved to a dedicated `mailio-db-writer` PM2 app later for independent
 * scaling. Concurrency is intentionally higher than the verification
 * worker — DB writes are cheap, and queueing up many of them lets Postgres
 * pipeline efficiently.
 *
 * Idempotency: `EmailsService.saveResult` / `markFailed` are conditional
 * on `status != COMPLETED` / `status != FAILED`, returning a boolean so we
 * only bump list counters when the row actually transitioned. Combined
 * with the BullMQ `jobId` dedupe in DbWriteService, a retried delivery is
 * harmless.
 */
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

  /**
   * Terminal-failure path for the DB writer. db.write retries 10× by
   * default, so reaching here means Postgres or downstream code has been
   * unhealthy for a sustained window — operator action required.
   */
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
      this.metrics?.dlqEntries
        .labels({ source_queue: DB_WRITE_QUEUE })
        .inc();
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

    // Only bump counters / advance now-serving on the FIRST time we
    // persist this email — a redelivered db.write must not double-count.
    if (d.listId && transitioned) {
      await this.bumpListAndEmit(d.listId, d.result, d.disposable);
      await this.advanceBulkCursor();
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
      await this.advanceBulkCursor();
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

  /**
   * Increment the list's per-result counters atomically and push a progress
   * event. Gateway emits are best-effort — wrap so a socket failure can't
   * cause this job to retry (which would silently double-count).
   */
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
      // Route through ProgressThrottler so per-email completions on the
      // legacy path coalesce to ≤1 WebSocket emit / sec / list — same
      // back-pressure guarantee the batch path gets for free.
      this.throttler.schedule(listId, snap);
    } catch (e) {
      this.logger.error(
        `incrementProcessed failed for list ${listId}: ${(e as Error).message}`,
      );
    }
  }

  private async advanceBulkCursor(): Promise<void> {
    try {
      await this.verificationService.advanceNowServing();
    } catch (e) {
      this.logger.warn(`advanceNowServing failed: ${(e as Error).message}`);
    }
  }

  // ── BATCH HANDLERS ───────────────────────────────────────────────────
  // Each batch handler collapses the per-email side effects (DB write +
  // list-counter bump + cursor advance + WS emit) of an entire batch into
  // a small fixed number of operations:
  //
  //   1. ONE saveResultsBatch / markFailedBatch (UNNEST UPDATE).
  //   2. ONE incrementProcessedBatch per listId (typically one).
  //   3. ONE INCRBY for the fairness cursor.
  //   4. AT MOST ONE WS emit per list per second (via ProgressThrottler).

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

    await this.advanceBulkCursorBy(transitioned.length);

    // Single-verify echo. Bulk uploads almost never carry single-verify
    // rows, but the legacy single-verify path could in principle land
    // here if a caller migrates it later — keep parity with handleSuccess.
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
      // Failed emails are surfaced as UNKNOWN in user-facing counters —
      // matches handleFailure() (single-row path).
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

    await this.advanceBulkCursorBy(transitioned.length);

    // One aggregate failure event per batch — the throttler is for
    // progress only, so this goes direct. Volume is bounded by retry
    // policy (~one terminal failure batch per upload at worst).
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
