import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import {
  EmailBatchJobPayload,
  EmailVerificationJobPayload,
} from './dto/job-payload.dto';

export const VERIFY_HIGH_QUEUE = 'verify.high';
export const VERIFY_BULK_QUEUE = 'verify.bulk';

export const VERIFICATION_QUEUE = VERIFY_BULK_QUEUE;

const SINGLE_PRIORITY = 1;
export const BULK_BASE_PRIORITY = 100;

export const PRIORITY_COUNTER_KEY = 'mailio:bulk:nowServing';

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
    @InjectQueue(VERIFY_BULK_QUEUE)
    private readonly bulkQueue: Queue<
      EmailVerificationJobPayload | EmailBatchJobPayload
    >,
  ) {}

  async enqueueSingle(emailId: string, userId: string): Promise<void> {
    await this.highQueue.add(
      'verify',
      { emailId, userId },
      { priority: SINGLE_PRIORITY, jobId: `single-${emailId}` },
    );
  }

  async enqueueBulk(
    emailIds: string[],
    userId: string,
    listId: string,
  ): Promise<void> {
    const base = await this.getEnqueueAnchor();
    await this.addBulkInBatches(emailIds, userId, listId, base, 0);
  }

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
        jobId: `bulk-${emailId}`,
      },
    }));
    const BATCH = 1000;
    for (let i = 0; i < jobs.length; i += BATCH) {
      await this.bulkQueue.addBulk(jobs.slice(i, i + BATCH));
    }
  }

  async enqueueBulkBatches(
    emailIds: string[],
    userId: string,
    listId: string,
    batchSize: number = DEFAULT_BULK_BATCH_SIZE,
  ): Promise<void> {
    if (emailIds.length === 0) return;

    const size = Math.max(1, Math.min(batchSize, MAX_BULK_BATCH_SIZE));
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
          jobId: `bulk-batch-${batchId}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 250 },
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

  async getNowServing(): Promise<number> {
    const client = await this.bulkQueue.client;
    const raw = await client.get(PRIORITY_COUNTER_KEY);
    return raw ? parseInt(raw, 10) : 0;
  }

  async getEnqueueAnchor(): Promise<number> {
    const cursor = await this.getNowServing();
    try {
      const waiting = await this.bulkQueue.getWaitingCount();
      return cursor + waiting;
    } catch {
      return cursor;
    }
  }

  async advanceNowServing(): Promise<void> {
    const client = await this.bulkQueue.client;
    await client.incr(PRIORITY_COUNTER_KEY);
  }

  async advanceNowServingBy(delta: number): Promise<void> {
    if (delta <= 0) return;
    const client = await this.bulkQueue.client;
    await client.incrby(PRIORITY_COUNTER_KEY, delta);
  }
}
