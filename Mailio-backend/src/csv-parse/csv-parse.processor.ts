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

    await this.listsRepo.update(listId, {
      parseStatus: EmailListParseStatus.PARSING,
      startedAt: new Date(),
    });

    let inserted = 0;
    let duplicates = 0;
    let detectedColumn: string | null = null;
    const quotaTruncated = false;
    const collectedIds: string[] = [];

    try {
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

      if (buffer.length > 0) {
        const ids = await this.insertBatch(userId, listId, buffer);
        collectedIds.push(...ids);
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

      // Reserve credits for the parsed row count BEFORE handing the list off
      // to the verification queue. If the caller can't afford it we abort the
      // job and mark the list FAILED — no provider calls happen, no credits
      // are deducted.
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
          // Mark list FAILED and move child emails to a TERMINAL state. We use
          // status=COMPLETED + verification_result=UNKNOWN (matching how the
          // worker's markFailed records system errors) so that the retry
          // endpoint — which only re-queues EmailStatus.FAILED rows — cannot
          // re-enqueue them without a fresh reservation. Users must re-upload
          // after topping up.
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

      // From this point on the reservation is "live" — if anything below
      // throws we must refund it, otherwise credits leak from the user's
      // account with no corresponding work. We DON'T re-throw inside the
      // refund block because retrying the parse job would (a) re-insert
      // duplicate email rows and (b) re-attempt the reservation.
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
        // Best-effort refund. If THIS fails too, we log loudly; a Super Admin
        // can reconcile from the ledger.
        try {
          await this.credits.refundBulkByListOwner(listId, userId, inserted);
        } catch (refundErr) {
          this.logger.error(
            `List ${listId}: CRITICAL — refund-after-publish-failure also failed: ${(refundErr as Error).message}`,
          );
        }
        // Mark list FAILED and child emails terminal so they aren't retried.
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
        `List ${listId}: parsed ${inserted} (dup=${duplicates}, truncated=${quotaTruncated}, file=${originalFilename})`,
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

  private looksLikeEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
}
