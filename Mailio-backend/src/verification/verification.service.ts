import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import {
  EmailBatchJobPayload,
  EmailVerificationJobPayload,
} from './dto/job-payload.dto';

/**
 * Two-queue split (Phase 6):
 *
 *   verify.high — single-address user-facing verifications. Small
 *                 concurrency so they're always serviced quickly without
 *                 starving bulk.
 *   verify.bulk — list verifications. Higher concurrency; jobs ordered
 *                 by the global now-serving cursor so multiple uploads
 *                 interleave fairly.
 *
 * Both queues share the same KeyPool, so the third-party rate budget is
 * a single global ceiling regardless of how concurrency is allocated
 * between the two queues. Splitting them only changes *fairness*, not
 * total throughput.
 *
 * Kept VERIFICATION_QUEUE as a deprecated alias for downstream code that
 * still imports the constant (Bull Board mount, etc.); new code should
 * pick the explicit token it needs.
 */
export const VERIFY_HIGH_QUEUE = 'verify.high';
export const VERIFY_BULK_QUEUE = 'verify.bulk';

/**
 * @deprecated use VERIFY_HIGH_QUEUE / VERIFY_BULK_QUEUE. Retained only so
 * older imports keep compiling during cutover — points to the bulk queue
 * because that's where the bulk processor's BullMQ events live.
 */
export const VERIFICATION_QUEUE = VERIFY_BULK_QUEUE;

const SINGLE_PRIORITY = 1;
export const BULK_BASE_PRIORITY = 100;

export const PRIORITY_COUNTER_KEY = 'mailio:bulk:nowServing';

/**
 * Default batch size for verify.bulk micro-batches. Rule of thumb:
 *   batch_size ≈ rate_per_key × avg_latency_seconds × safety_factor
 *   (e.g. 30 RPS × 1.5 s × 1.1 ≈ 50)
 *
 * Hard ceiling at 100 in enqueueBulkBatches to bound worker heap.
 */
const DEFAULT_BULK_BATCH_SIZE = parseInt(
  process.env.BULK_BATCH_SIZE ?? '50',
  10,
);
const MAX_BULK_BATCH_SIZE = 100;

@Injectable()
export class VerificationService {
  constructor(
    @InjectQueue(VERIFY_HIGH_QUEUE)
    private readonly highQueue: Queue<EmailVerificationJobPayload>,
    // verify.bulk now carries either per-email or batch payloads depending
    // on which producer enqueued it. The union keeps both shapes typed
    // until the legacy path is removed in Phase 4.
    @InjectQueue(VERIFY_BULK_QUEUE)
    private readonly bulkQueue: Queue<
      EmailVerificationJobPayload | EmailBatchJobPayload
    >,
  ) {}

  /**
   * Singles go to the dedicated verify.high queue. Priority is set to 1
   * (lowest number = highest priority in BullMQ) — only meaningful if a
   * future change ever routes mixed traffic into this queue.
   */
  async enqueueSingle(emailId: string, userId: string): Promise<void> {
    await this.highQueue.add(
      'verify',
      { emailId, userId },
      // BullMQ disallows ":" in custom jobIds (it's the Redis key separator).
      { priority: SINGLE_PRIORITY, jobId: `single-${emailId}` },
    );
  }

  /**
   * Bulk enqueue. Priority within verify.bulk is the now-serving cursor +
   * an index, so concurrent uploads interleave instead of starving each
   * other:
   *
   *   t=0  Counter=0.  User A uploads 200 → priorities 100..299
   *   t=…  Worker finishes 100 of A's → Counter=100.
   *   t=…  User B uploads 200          → priorities 200..399
   *        ▲ B's first email ties with A's 101st → BullMQ alternates.
   */
  async enqueueBulk(
    emailIds: string[],
    userId: string,
    listId: string,
  ): Promise<void> {
    // Anchor at cursor + waiting, NOT bare cursor — see getEnqueueAnchor
    // for the fairness rationale. Without this, fast back-to-back uploads
    // all collide on the same priority band and FIFO starves the newer
    // lists at 0/0/0 in the UI until they finally bubble up.
    const base = await this.getEnqueueAnchor();
    await this.addBulkInBatches(emailIds, userId, listId, base, 0);
  }

  /**
   * Streaming variant for the CSV parser. Caller pre-fetches `base` once
   * via getNowServing() and supplies `indexStart` so each batch lays
   * strictly-increasing priorities within the same upload.
   */
  async enqueueBulkWithBase(
    emailIds: string[],
    userId: string,
    listId: string,
    base: number,
    indexStart: number,
  ): Promise<void> {
    await this.addBulkInBatches(emailIds, userId, listId, base, indexStart);
  }

  private async addBulkInBatches(
    emailIds: string[],
    userId: string,
    listId: string,
    base: number,
    indexStart: number,
  ): Promise<void> {
    if (emailIds.length === 0) return;
    const jobs = emailIds.map((emailId, i) => ({
      name: 'verify' as const,
      data: { emailId, userId, listId },
      opts: {
        priority: BULK_BASE_PRIORITY + base + indexStart + i,
        // BullMQ-level dedupe — a retried CSV parse delivering the same
        // ids twice won't double-enqueue. The DB-level tryClaim is still
        // the authoritative idempotency boundary. Note: ":" is forbidden
        // in BullMQ custom jobIds (Redis key separator), hence the dash.
        jobId: `bulk-${emailId}`,
      },
    }));
    const BATCH = 1000;
    for (let i = 0; i < jobs.length; i += BATCH) {
      await this.bulkQueue.addBulk(jobs.slice(i, i + BATCH));
    }
  }

  /**
   * Micro-batch bulk enqueue. Groups emailIds into batches of
   * BULK_BATCH_SIZE and pushes ONE BullMQ job per batch.
   *
   * Priority math is the same algebra as enqueueBulk — each batch is
   * anchored at the FIRST email's would-be priority, so a batch of 50
   * starting at email index 100 lands at priority 100 + base + 100 (not
   * 100 + base + 0). That makes the fairness cursor in
   * PRIORITY_AND_WORKERS.md continue to hold: the cursor still measures
   * EMAILS (DbWriteProcessor calls advanceNowServingBy(transitionedCount)
   * after each batch).
   */
  async enqueueBulkBatches(
    emailIds: string[],
    userId: string,
    listId: string,
    batchSize: number = DEFAULT_BULK_BATCH_SIZE,
  ): Promise<void> {
    if (emailIds.length === 0) return;

    const size = Math.max(1, Math.min(batchSize, MAX_BULK_BATCH_SIZE));
    // Anchor at queue tail (cursor + waiting) so concurrent uploads don't
    // collide on the same priority band. See getEnqueueAnchor docstring.
    const base = await this.getEnqueueAnchor();
    const totalBatches = Math.ceil(emailIds.length / size);

    const jobs: {
      name: 'verify.batch';
      data: EmailBatchJobPayload;
      opts: {
        priority: number;
        jobId: string;
        attempts: number;
        backoff: { type: 'exponential'; delay: number };
        removeOnComplete: { age: number; count: number };
        removeOnFail: { age: number; count: number };
      };
    }[] = [];
    let emailOffset = 0;

    for (let b = 0; b < totalBatches; b++) {
      const slice = emailIds.slice(b * size, (b + 1) * size);
      const batchId = randomUUID();
      jobs.push({
        name: 'verify.batch',
        data: { batchId, userId, listId, emailIds: slice },
        opts: {
          priority: BULK_BASE_PRIORITY + base + emailOffset,
          // BullMQ disallows ":" in custom jobIds (Redis key separator).
          jobId: `bulk-batch-${batchId}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400, count: 5000 },
        },
      });
      emailOffset += slice.length;
    }

    const ADD_BULK_CHUNK = 1000;
    for (let i = 0; i < jobs.length; i += ADD_BULK_CHUNK) {
      await this.bulkQueue.addBulk(jobs.slice(i, i + ADD_BULK_CHUNK));
    }
  }

  /**
   * Raw "now-serving" cursor — the count of bulk emails that have
   * COMPLETED. Used by the starvation guard to re-anchor stale jobs to
   * the FRONT of the queue (the current serving position).
   */
  async getNowServing(): Promise<number> {
    const client = await this.bulkQueue.client;
    const raw = await client.get(PRIORITY_COUNTER_KEY);
    return raw ? parseInt(raw, 10) : 0;
  }

  /**
   * Enqueue anchor for NEW uploads.
   *
   * Returns `cursor + waiting` so a fresh upload starts its priority
   * band at the back of the currently-queued work, NOT tied with the
   * front. This is critical when uploads arrive faster than
   * verifications can drain them: without it, multiple back-to-back
   * uploads all capture the same low cursor value, every list lands in
   * the same priority band, and BullMQ falls back to FIFO — meaning the
   * first list is fully processed before the second receives any work
   * (user sees newest uploads stuck at 0/0/0 in the UI).
   *
   * With the +waiting offset, each upload's first email starts at a
   * priority strictly worse than every currently-queued email but
   * strictly better than the next upload's. The starvation guard then
   * promotes any list that ages past the threshold back to the front,
   * preventing actual starvation.
   *
   * The waiting count is a snapshot — slightly stale by the time the
   * batch is enqueued, which is fine: the goal is to avoid LARGE
   * priority collisions, not to assign exact slot numbers.
   */
  async getEnqueueAnchor(): Promise<number> {
    const cursor = await this.getNowServing();
    try {
      const waiting = await this.bulkQueue.getWaitingCount();
      return cursor + waiting;
    } catch {
      // Redis blip — fall back to the bare cursor. Worst case is the
      // FIFO collision this method exists to avoid; correctness intact.
      return cursor;
    }
  }

  /**
   * Atomic increment. Called by DbWriteProcessor after each completed
   * BULK email; singles ride priority 1 in their own queue and don't
   * touch this counter.
   */
  async advanceNowServing(): Promise<void> {
    const client = await this.bulkQueue.client;
    await client.incr(PRIORITY_COUNTER_KEY);
  }

  /**
   * Bulk-advance the now-serving counter by N. Called by DbWriteProcessor
   * after each completed BATCH with N = number of transitioned rows. One
   * INCRBY replaces N individual INCRs; the cursor's semantics (it counts
   * EMAILS, not batches) are unchanged so the priority algebra in
   * enqueueBulkBatches still produces fair interleaving for concurrent
   * uploads.
   */
  async advanceNowServingBy(delta: number): Promise<void> {
    if (delta <= 0) return;
    const client = await this.bulkQueue.client;
    await client.incrby(PRIORITY_COUNTER_KEY, delta);
  }
}
