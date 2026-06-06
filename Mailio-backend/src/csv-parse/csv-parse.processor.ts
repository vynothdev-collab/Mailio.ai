import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import { DataSource, Repository } from 'typeorm';
import {
  CreditsService,
  InsufficientCreditsException,
} from '../credits/credits.service';
import { DlqService } from '../dlq/dlq.service';
import {
  EmailList,
  EmailListParseStatus,
  EmailListStatus,
} from '../email-lists/entities/email-list.entity';
import { EmailStatus } from '../emails/entities/email.entity';
import { MetricsService } from '../metrics/metrics.service';
import { User } from '../users/entities/user.entity';
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
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly verification: VerificationService,
    private readonly dlq: DlqService,
    private readonly credits: CreditsService,
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
    const MAX_EMAILS = 100_000;

    await this.listsRepo.update(listId, {
      parseStatus: EmailListParseStatus.PARSING,
      startedAt: new Date(),
    });

    let inserted = 0;
    let duplicates = 0;
    let detectedColumn: string | null = null;
    let limitExceeded = false;
    let quotaTruncated = false;
    const collectedIds: string[] = [];

    try {
      const seen = new Set<string>();
      let isFirstRow = true;
      const buffer: string[] = [];

      const readStream = fs.createReadStream(filePath);
      const csvParser = parse({
        trim: true,
        skip_empty_lines: true,
        relax_column_count: true,
      });
      const parser = readStream.pipe(csvParser);

      const flushIfFull = async (): Promise<void> => {
        if (buffer.length < this.BATCH) return;
        parser.pause();
        try {
          const ids = await this.insertBatch(
            userId,
            listId,
            buffer.splice(0, buffer.length),
          );
          collectedIds.push(...ids);
          inserted += ids.length;
        } finally {
          parser.resume();
        }
      };

      await new Promise<void>((resolve, reject) => {
        parser.on('data', (row: string[]) => {
          if (limitExceeded) return;
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

              if (seen.size > MAX_EMAILS) {
                limitExceeded = true;
                readStream.destroy();
                return;
              }

              buffer.push(raw);
              await flushIfFull();
            } catch (e) {
              parser.destroy(e as Error);
            }
          })();
        });

        parser.on('end', () => resolve());
        parser.on('close', () => resolve());
        parser.on('error', (e) => {
          if (limitExceeded) resolve();
          else reject(e);
        });
      });

      if (limitExceeded) {
        if (collectedIds.length > 0) {
          await this.dataSource.query(`DELETE FROM emails WHERE list_id = $1`, [
            listId,
          ]);
        }
        await this.listsRepo.update(listId, {
          parseStatus: EmailListParseStatus.FAILED,
          parseError: `File exceeds the ${MAX_EMAILS.toLocaleString()} email limit per upload. Please split your list into smaller files.`,
          status: EmailListStatus.FAILED,
          totalCount: 0,
          duplicates,
          detectedColumn,
          quotaTruncated: false,
        });
        this.logger.warn(
          `List ${listId}: rejected — exceeded ${MAX_EMAILS} email limit (file=${originalFilename})`,
        );
        return;
      }

      if (buffer.length > 0) {
        const ids = await this.insertBatch(userId, listId, buffer);
        collectedIds.push(...ids);
        inserted += ids.length;
      }

      if (inserted === 0) {
        await this.listsRepo.update(listId, {
          parseStatus: EmailListParseStatus.FAILED,
          parseError: 'No valid email addresses found in file',
          status: EmailListStatus.FAILED,
          duplicates,
          detectedColumn,
          quotaTruncated: false,
        });
        this.logger.warn(
          `List ${listId}: no usable rows — marked FAILED (parse)`,
        );
        return;
      }

      const owner = await this.usersRepo.findOne({ where: { id: userId } });
      if (!owner) {
        throw new Error(`Owner user ${userId} not found for list ${listId}`);
      }

      let reservedBalanceAfter: number;
      try {
        const { balanceAfter } = await this.credits.reserveForBulk(
          owner,
          listId,
          inserted,
        );
        reservedBalanceAfter = balanceAfter;
        await this.listsRepo.update(listId, {
          creditsReserved: String(inserted),
        });
        this.logger.log(
          `List ${listId}: reserved ${inserted} credits (balanceAfter=${balanceAfter})`,
        );
      } catch (e) {
        if (e instanceof InsufficientCreditsException) {
          await this.listsRepo.update(listId, {
            parseStatus: EmailListParseStatus.PARSED,
            status: EmailListStatus.FAILED,
            totalCount: inserted,
            duplicates,
            detectedColumn,
            quotaTruncated,
            parseError: 'Insufficient credits to start this bulk job.',
          });
          this.logger.warn(
            `List ${listId}: insufficient credits for ${inserted} rows — marked FAILED`,
          );
          await this.dataSource.query(
            `UPDATE emails
                SET status              = 'COMPLETED'::emails_status_enum,
                    verification_result = 'UNKNOWN'::emails_verification_result_enum,
                    error_message       = $1
              WHERE list_id = $2 AND status = $3::emails_status_enum`,
            ['Insufficient credits', listId, EmailStatus.QUEUED],
          );
          return;
        }
        throw e;
      }

      try {
        await this.listsRepo.update(listId, {
          parseStatus: EmailListParseStatus.PARSED,
          status: EmailListStatus.PROCESSING,
          totalCount: inserted,
          duplicates,
          detectedColumn,
          quotaTruncated,
        });

        if (process.env.BULK_BATCH_ENABLED === 'true') {
          await this.verification.enqueueBulkBatches(
            collectedIds,
            userId,
            listId,
            undefined,
            inserted,
          );
        } else {
          const baseOffset = await this.verification.getEnqueueAnchor();
          await this.verification.enqueueBulkWithBase(
            collectedIds,
            userId,
            listId,
            baseOffset,
            0,
            inserted,
          );
        }
      } catch (e) {
        this.logger.error(
          `List ${listId}: failed to publish after reservation (balanceAfter=${reservedBalanceAfter}) — refunding ${inserted} credits: ${(e as Error).message}`,
        );

        try {
          await this.credits.refundBulkByListOwner(listId, userId, inserted);
        } catch (refundErr) {
          this.logger.error(
            `List ${listId}: CRITICAL — refund-after-publish-failure also failed: ${(refundErr as Error).message}`,
          );
        }

        await this.listsRepo.update(listId, {
          parseStatus: EmailListParseStatus.PARSED,
          status: EmailListStatus.FAILED,
          totalCount: inserted,
          parseError: `Failed to queue verification jobs: ${(e as Error).message}`,
        });
        await this.dataSource.query(
          `UPDATE emails
              SET status              = 'COMPLETED'::emails_status_enum,
                  verification_result = 'UNKNOWN'::emails_verification_result_enum,
                  error_message       = $1
            WHERE list_id = $2 AND status = $3::emails_status_enum`,
          ['Failed to queue for verification', listId, EmailStatus.QUEUED],
        );
        return;
      }

      this.logger.log(
        `List ${listId}: parsed ${inserted} (dup=${duplicates}, file=${originalFilename})`,
      );
    } catch (e) {
      const msg = (e as Error).message;
      this.logger.error(`Parse failed for list ${listId}: ${msg}`);
      await this.listsRepo.update(listId, {
        parseStatus: EmailListParseStatus.FAILED,
        parseError: msg,
        totalCount: inserted,
        duplicates,
        detectedColumn,
        quotaTruncated: false,
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

  private looksLikeEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
}
