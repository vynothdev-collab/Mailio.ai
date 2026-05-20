import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CSV_PARSE_QUEUE, CsvParseJob } from './csv-parse.types';

@Injectable()
export class CsvParseService {
  constructor(
    @InjectQueue(CSV_PARSE_QUEUE) private readonly queue: Queue<CsvParseJob>,
  ) {}

  async enqueue(job: CsvParseJob): Promise<void> {
    await this.queue.add('parse', job, { jobId: `parse-${job.listId}` });
  }
}
