import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  DB_WRITE_QUEUE,
  DbWriteFailureBatchJob,
  DbWriteJob,
  DbWriteSuccessBatchJob,
} from './db-write.types';

@Injectable()
export class DbWriteService {
  constructor(
    @InjectQueue(DB_WRITE_QUEUE) private readonly queue: Queue<DbWriteJob>,
  ) {}

  async enqueue(job: DbWriteJob): Promise<void> {
    if (job.kind === 'success' || job.kind === 'failure') {
      await this.queue.add(job.kind, job, {
        jobId: `${job.kind === 'success' ? 'ok' : 'fail'}-${job.emailId}`,
        attempts: parseInt(process.env.DB_WRITE_MAX_RETRIES ?? '10', 10),
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.DB_WRITE_BACKOFF_DELAY_MS ?? '1000', 10),
        },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: true,
      });
      return;
    }
    await this.enqueueBatch(job);
  }

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
