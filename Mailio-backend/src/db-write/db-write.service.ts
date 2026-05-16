import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  DB_WRITE_QUEUE,
  DbWriteFailureBatchJob,
  DbWriteJob,
  DbWriteSuccessBatchJob,
} from './db-write.types';

/**
 * Producer-side facade used by the verification worker.
 *
 * Per-email path:  jobId is derived from the email row so a redelivery
 *                  of the same verification result is collapsed by BullMQ
 *                  — defence in depth on top of the existing
 *                  `status != COMPLETED` conditional update.
 *
 * Batch path:      jobId is derived from the batchId (uuid generated at
 *                  enqueueBulkBatches time). One success-batch job and at
 *                  most one failure-batch job per batchId; safe to retry.
 */
@Injectable()
export class DbWriteService {
  constructor(
    @InjectQueue(DB_WRITE_QUEUE) private readonly queue: Queue<DbWriteJob>,
  ) {}

  async enqueue(job: DbWriteJob): Promise<void> {
    if (job.kind === 'success' || job.kind === 'failure') {
      // BullMQ disallows ":" in custom jobIds (it's the Redis key separator).
      await this.queue.add(job.kind, job, {
        jobId: `${job.kind === 'success' ? 'ok' : 'fail'}-${job.emailId}`,
      });
      return;
    }
    // Forward batch kinds through the dedicated entry so call sites can
    // use a single enqueue API regardless of payload shape.
    await this.enqueueBatch(job);
  }

  /**
   * Batch entry point. Emits a single db.write job containing the rows of
   * a completed (or finally-failed) verify.batch job. Persistence runs
   * decoupled from verification, so a slow Postgres can't push back into
   * the rate-limited provider call path.
   */
  async enqueueBatch(
    job: DbWriteSuccessBatchJob | DbWriteFailureBatchJob,
  ): Promise<void> {
    const prefix = job.kind === 'success-batch' ? 'ok-batch' : 'fail-batch';
    await this.queue.add(job.kind, job, {
      jobId: `${prefix}-${job.batchId}`,
      attempts: parseInt(process.env.DB_WRITE_MAX_RETRIES ?? '10', 10),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.DB_WRITE_BACKOFF_DELAY_MS ?? '1000', 10),
      },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400, count: 5000 },
    });
  }
}
