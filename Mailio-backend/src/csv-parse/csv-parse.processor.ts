import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import { DataSource, Repository } from 'typeorm';
import { DlqService } from '../dlq/dlq.service';
import {
  EmailList,
  EmailListParseStatus,
  EmailListStatus,
} from '../email-lists/entities/email-list.entity';
import { EmailStatus } from '../emails/entities/email.entity';
import { MetricsService } from '../metrics/metrics.service';
import { VerificationService } from '../verification/verification.service';
import { CSV_PARSE_QUEUE, CsvParseJob } from './csv-parse.types';

@Processor(CSV_PARSE_QUEUE, {
  concurrency: parseInt(process.env.CSV_PARSE_CONCURRENCY ?? '2', 10),
})
export class CsvParseProcessor extends WorkerHost {
  private readonly logger = new Logger(CsvParseProcessor.name);
  private readonly BATCH = parseInt(process.env.CSV_PARSE_BATCH ?? '2000', 10);

  constructor(
    @InjectRepository(EmailList)
    private readonly listsRepo: Repository<EmailList>,
    private readonly dataSource: DataSource,
    private readonly verification: VerificationService,
    private readonly dlq: DlqService,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<CsvParseJob>, err: Error): Promise<void> {
    const attemptsMade = job.attemptsMade ?? 0;
    const maxAttempts = job.opts?.attempts ?? 1;
    if (attemptsMade < maxAttempts) return;

    this.logger.error(
      `csv.parse job ${job.id} permanently failed: ${err.message}`,
    );
    try {
      await this.dlq.push({
        sourceQueue: CSV_PARSE_QUEUE,
        jobName: job.name,
        userId: job.data.userId ?? null,
        payload: job.data as unknown as Record<string, unknown>,
        errorMessage: err.message,
        attempts: attemptsMade,
      });
      this.metrics?.dlqEntries.labels({ source_queue: CSV_PARSE_QUEUE }).inc();
    } catch (e) {
      this.logger.warn(`DLQ push failed: ${(e as Error).message}`);
    }
  }

  async process(job: Job<CsvParseJob>): Promise<void> {
    const { listId, userId, filePath, originalFilename } = job.data;

    // Flip the list into PARSING so the UI can show a distinct state and
    // a duplicate enqueue (rare; jobId-deduped) becomes a no-op.
    await this.listsRepo.update(listId, {
      parseStatus: EmailListParseStatus.PARSING,
      startedAt: new Date(),
    });

    let inserted = 0;
    let duplicates = 0;
    let detectedColumn: string | null = null;
    const quotaTruncated = false;
    let baseOffset: number | undefined;

    try {

      baseOffset = await this.verification.getEnqueueAnchor();

      const seen = new Set<string>();
      let isFirstRow = true;
      const buffer: string[] = [];

      const parser = fs.createReadStream(filePath).pipe(
        parse({
          trim: true,
          skip_empty_lines: true,
          relax_column_count: true,
        }),
      );

      // Pause/resume the parser stream so we don't accumulate unbounded
      // rows in memory while the DB flush is running.
      const flushIfFull = async (): Promise<void> => {
        if (buffer.length < this.BATCH) return;
        parser.pause();
        try {
          const ids = await this.insertBatch(
            userId,
            listId,
            buffer.splice(0, buffer.length),
          );
          await this.enqueueVerifyBatch(
            ids,
            userId,
            listId,
            baseOffset!,
            inserted,
          );
          inserted += ids.length;
        } finally {
          parser.resume();
        }
      };

      // Promisify the stream so we can await inside the data handler.
      await new Promise<void>((resolve, reject) => {
        parser.on('data', (row: string[]) => {
          void (async () => {
            try {
              const raw = (row[0] ?? '').trim().toLowerCase();

              if (isFirstRow) {
                isFirstRow = false;
                if (!this.looksLikeEmail(raw)) {
                  detectedColumn = raw || 'email';
                  return;
                }
              }
              if (!raw || !this.looksLikeEmail(raw)) return;
              if (seen.has(raw)) {
                duplicates++;
                return;
              }
              seen.add(raw);

              buffer.push(raw);
              await flushIfFull();
            } catch (e) {
              parser.destroy(e as Error);
            }
          })();
        });

        parser.on('end', () => resolve());
        parser.on('error', reject);
      });

      // Final flush of whatever's left in the buffer.
      if (buffer.length > 0) {
        const ids = await this.insertBatch(userId, listId, buffer);
        await this.enqueueVerifyBatch(
          ids,
          userId,
          listId,
          baseOffset,
          inserted,
        );
        inserted += ids.length;
      }

      if (inserted === 0) {
        const parseError = quotaTruncated
          ? 'Monthly quota exhausted before any rows could be inserted — upgrade your plan or wait for the quota to reset.'
          : 'No valid email addresses found in file';
        await this.listsRepo.update(listId, {
          parseStatus: EmailListParseStatus.FAILED,
          parseError,
          status: EmailListStatus.FAILED,
          duplicates,
          detectedColumn,
          quotaTruncated,
        });
        this.logger.warn(
          `List ${listId}: no usable rows — marked FAILED (${quotaTruncated ? 'quota' : 'parse'})`,
        );
        return;
      }

      await this.listsRepo.update(listId, {
        parseStatus: EmailListParseStatus.PARSED,
        status: EmailListStatus.PROCESSING,
        totalCount: inserted,
        duplicates,
        detectedColumn,
        quotaTruncated,
      });

      this.logger.log(
        `List ${listId}: parsed ${inserted} (dup=${duplicates}, truncated=${quotaTruncated}, file=${originalFilename})`,
      );
    } catch (e) {
      const msg = (e as Error).message;
      this.logger.error(`Parse failed for list ${listId}: ${msg}`);
      await this.listsRepo.update(listId, {
        parseStatus: EmailListParseStatus.FAILED,
        parseError: msg,
        // Don't blow away rows already inserted — leave whatever made it
        // through so the user can re-run / partial-retry.
        totalCount: inserted,
        duplicates,
        detectedColumn,
        quotaTruncated,
      });
      throw e;
    } finally {
      fs.unlink(filePath, () => {});
    }
  }

  private async insertBatch(
    userId: string,
    listId: string,
    addresses: string[],
  ): Promise<string[]> {
    if (addresses.length === 0) return [];

    const params: unknown[] = [userId, listId, EmailStatus.QUEUED];
    const values: string[] = [];
    addresses.forEach((addr, i) => {
      params.push(addr);
      values.push(`($1, $2, $${i + 4}, false, $3)`);
    });

    const sql = `
      INSERT INTO emails (user_id, list_id, address, is_single_verify, status)
      VALUES ${values.join(', ')}
      RETURNING id
    `;
    const rows: { id: string }[] = await this.dataSource.query(sql, params);
    return rows.map((r) => r.id);
  }

  private async enqueueVerifyBatch(
    ids: string[],
    userId: string,
    listId: string,
    baseOffset: number,
    indexStart: number,
  ): Promise<void> {
    if (ids.length === 0) return;
    await this.verification.enqueueBulkWithBase(
      ids,
      userId,
      listId,
      baseOffset,
      indexStart,
    );
  }

  private looksLikeEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
}
