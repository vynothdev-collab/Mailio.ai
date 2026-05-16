import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { CSV_PARSE_QUEUE } from '../csv-parse/csv-parse.types';
import { DB_WRITE_QUEUE } from '../db-write/db-write.types';
import {
  VERIFY_BULK_QUEUE,
  VERIFY_HIGH_QUEUE,
} from '../verification/verification.service';
import { DlqJob, DlqStatus } from './entities/dlq-job.entity';

export interface DlqPushInput {
  sourceQueue: string;
  jobName: string;
  userId: string | null;
  payload: Record<string, unknown>;
  errorMessage: string;
  attempts: number;
}

@Injectable()
export class DlqService {
  private readonly logger = new Logger(DlqService.name);
  private readonly queues: Record<string, Queue>;

  constructor(
    @InjectRepository(DlqJob)
    private readonly repo: Repository<DlqJob>,
    @InjectQueue(VERIFY_HIGH_QUEUE) high: Queue,
    @InjectQueue(VERIFY_BULK_QUEUE) bulk: Queue,
    @InjectQueue(DB_WRITE_QUEUE) dbWrite: Queue,
    @InjectQueue(CSV_PARSE_QUEUE) csvParse: Queue,
  ) {
    this.queues = {
      [VERIFY_HIGH_QUEUE]: high,
      [VERIFY_BULK_QUEUE]: bulk,
      [DB_WRITE_QUEUE]: dbWrite,
      [CSV_PARSE_QUEUE]: csvParse,
    };
  }

  async push(input: DlqPushInput): Promise<DlqJob> {
    try {
      return await this.repo.save(
        this.repo.create({
          sourceQueue: input.sourceQueue,
          jobName: input.jobName,
          userId: input.userId,
          payload: input.payload,
          errorMessage: input.errorMessage.slice(0, 4000),
          attempts: input.attempts,
          status: DlqStatus.PENDING,
        }),
      );
    } catch (e) {
      this.logger.error(`DLQ push failed: ${(e as Error).message}`);
      throw e;
    }
  }

  async list(opts: {
    page: number;
    limit: number;
    sourceQueue?: string;
    status?: DlqStatus;
    userId?: string;
  }): Promise<{ data: DlqJob[]; total: number; page: number; limit: number }> {
    const qb = this.repo
      .createQueryBuilder('d')
      .orderBy('d.created_at', 'DESC')
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit);
    if (opts.sourceQueue)
      qb.andWhere('d.source_queue = :sq', { sq: opts.sourceQueue });
    if (opts.status) qb.andWhere('d.status = :st', { st: opts.status });
    if (opts.userId) qb.andWhere('d.user_id = :uid', { uid: opts.userId });
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: opts.page, limit: opts.limit };
  }

  async findOne(id: string): Promise<DlqJob> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('DLQ entry not found');
    return row;
  }

  async retry(id: string): Promise<DlqJob> {
    const row = await this.findOne(id);
    if (row.status !== DlqStatus.PENDING) {
      throw new NotFoundException(
        `DLQ entry ${id} is already ${row.status.toLowerCase()}`,
      );
    }
    const queue = this.queues[row.sourceQueue];
    if (!queue) {
      throw new NotFoundException(
        `Unknown source queue ${row.sourceQueue} — cannot retry`,
      );
    }

    const job = await queue.add(row.jobName, row.payload);

    row.status = DlqStatus.RETRIED;
    row.retriedAt = new Date();
    row.retriedToJob = String(job.id);
    await this.repo.save(row);
    return row;
  }

  async discard(id: string): Promise<DlqJob> {
    const row = await this.findOne(id);
    if (row.status !== DlqStatus.PENDING) return row;
    row.status = DlqStatus.DISCARDED;
    await this.repo.save(row);
    return row;
  }
}
