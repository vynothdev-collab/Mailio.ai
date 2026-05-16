import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CSV_PARSE_QUEUE, CsvParseJob } from './csv-parse.types';

/**
 * Producer-side façade. Used by BulkVerifyController.upload(); jobId is
 * the listId so a re-submission of the same row (e.g. operator manually
 * re-enqueues) is collapsed.
 */
@Injectable()
export class CsvParseService {
  constructor(
    @InjectQueue(CSV_PARSE_QUEUE) private readonly queue: Queue<CsvParseJob>,
  ) {}

  async enqueue(job: CsvParseJob): Promise<void> {
    // BullMQ disallows ":" in custom jobIds (it's the Redis key separator).
    await this.queue.add('parse', job, { jobId: `parse-${job.listId}` });
  }
}
