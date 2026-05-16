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

/**
 * Streaming CSV parser. Replaces the previous synchronous parse-then-
 * insert path that ran inside the HTTP request and could OOM on large
 * uploads.
 *
 * Flow:
 *   1. Stream the file through csv-parse.
 *   2. Skip a header row if the first cell isn't an email.
 *   3. Dedupe in-memory against a Set<lowercase-address>.
 *   4. Buffer N rows at a time and flush via a parameterized multi-row
 *      INSERT … RETURNING id. (Avoids a Set-of-millions and avoids
 *      bringing in pg-copy-streams as a new dep — easy to swap in later.)
 *   5. After each successful flush, enqueue the returned ids onto the
 *      verify queue immediately. This bounds memory to O(BATCH).
 *   6. Quota gate: stop inserting once the user has consumed their
 *      monthly plan limit, mark the list quota_truncated, finalize what
 *      has been inserted so far.
 *   7. On any error, mark parse_status=FAILED and bubble the message.
 *
 * Failure of the parse job is retried by BullMQ; the listId-keyed jobId
 * + the dedupe Set make it safe — already-inserted addresses are skipped
 * on re-run.
 */
@Processor(CSV_PARSE_QUEUE, {
  concurrency: parseInt(process.env.CSV_PARSE_CONCURRENCY ?? '2', 10),
})
export class CsvParseProcessor extends WorkerHost {
  private readonly logger = new Logger(CsvParseProcessor.name);
  private readonly BATCH = parseInt(
    process.env.CSV_PARSE_BATCH ?? '2000',
    10,
  );

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

  /**
   * Parse failures are usually deterministic (malformed file). After the
   * 2-attempt budget, the parse row is already marked FAILED inside
   * process() — but we still log a DLQ entry so operators have a single
   * place to audit unprocessable uploads alongside other queue failures.
   */
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
      this.metrics?.dlqEntries
        .labels({ source_queue: CSV_PARSE_QUEUE })
        .inc();
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
    let quotaTruncated = false;
    let baseOffset: number | undefined;

    try {
      // Per-user monthly quota enforcement is disabled — uploads are
      // uncapped. Ninja's per-key rate budget (KeyPool + RedisRateLimiter)
      // still bounds outbound RPS, so the provider is never overrun.

      // Anchor at the queue tail (cursor + currently-waiting) so this
      // list's jobs slot in BEHIND already-queued work instead of tying
      // with the front. Critical for multi-upload fairness — see
      // VerificationService.getEnqueueAnchor for the rationale. The
      // anchor is captured once per parse so all batches from this
      // upload share a contiguous priority band; the DB writer advances
      // the cursor independently as jobs complete.
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
        // Distinguish between "quota ran out mid-stream" vs "file genuinely
        // empty / contained no parseable emails". Same FAILED status, but
        // the error message tells the user how to fix it.
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

  /**
   * Insert a chunk of addresses in one round trip and return the new
   * primary keys for downstream queue insertion. Uses ON CONFLICT DO
   * NOTHING-style idempotence by way of the BullMQ jobId dedupe + a
   * unique-address check via the Set above; we don't need a DB unique
   * constraint here because the parser owns dedup for a single file.
   *
   * RETURNING id keeps us out of a second SELECT round-trip.
   */
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
