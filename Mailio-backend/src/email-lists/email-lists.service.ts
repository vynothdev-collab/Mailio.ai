import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { VerificationResult } from '../common/types/verification-result.enum';
import { Email, EmailStatus } from '../emails/entities/email.entity';
import { EmailList, EmailListStatus } from './entities/email-list.entity';

const CHUNK_SIZE = 500;

interface ParseResult {
  addresses: string[];
  duplicates: number;
  detectedColumn: string;
}

/** Per-result deltas for a single batch grouped by listId. */
export interface ListDeltas {
  processed: number;
  valid: number;
  invalid: number;
  risky: number;
  unknown: number;
  disposable: number;
}

@Injectable()
export class EmailListsService {
  constructor(
    @InjectRepository(EmailList)
    private readonly listsRepo: Repository<EmailList>,
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
  ) {}

  async createFromFile(
    userId: string,
    name: string,
    filePath: string,
    originalFilename: string,
  ): Promise<{
    list: EmailList;
    emailIds: string[];
    duplicates: number;
    detectedColumn: string;
  }> {
    const list = await this.listsRepo.save(
      this.listsRepo.create({ userId, name, originalFilename }),
    );

    const { addresses, duplicates, detectedColumn } =
      await this.parseFile(filePath);
    if (addresses.length === 0) {
      throw new BadRequestException('No valid email addresses found in file');
    }

    // Bulk INSERT path. TypeORM's .save([...]) issues a SELECT-then-INSERT
    // per entity (it's upsert-shaped), which becomes the dominant phase of
    // the upload for large lists (50k rows = 100k round trips, often
    // 30+ seconds of upload latency the user just waits through).
    //
    // .insert() emits a single multi-row INSERT per chunk with RETURNING id,
    // collapsing the chunk into ONE round trip. With CHUNK_SIZE=500 a
    // 50k upload becomes 100 round trips instead of 100,000.
    const emailIds: string[] = [];
    for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
      const chunk = addresses.slice(i, i + CHUNK_SIZE);
      const values = chunk.map((address) => ({
        address,
        userId,
        listId: list.id,
        isSingleVerify: false,
        status: EmailStatus.QUEUED,
      }));
      const result = await this.emailsRepo
        .createQueryBuilder()
        .insert()
        .into(Email)
        .values(values)
        .returning(['id'])
        .execute();
      const ids = (result.identifiers ?? []).map(
        (idObj) => (idObj as { id: string }).id,
      );
      emailIds.push(...ids);
    }

    await this.listsRepo.update(list.id, {
      totalCount: addresses.length,
      status: EmailListStatus.PROCESSING,
      startedAt: new Date(),
    });

    fs.unlink(filePath, () => {});

    return {
      list: { ...list, totalCount: addresses.length },
      emailIds,
      duplicates,
      detectedColumn,
    };
  }

  async incrementProcessed(
    listId: string,
    result: VerificationResult,
    isDisposable: boolean,
  ): Promise<{ processed: number; total: number; status: EmailListStatus }> {
    const resultCol = {
      [VerificationResult.VALID]: 'valid_count',
      [VerificationResult.INVALID]: 'invalid_count',
      [VerificationResult.RISKY]: 'risky_count',
      [VerificationResult.UNKNOWN]: 'unknown_count',
    }[result];

    const disposableClause = isDisposable
      ? ', disposable_count = disposable_count + 1'
      : '';

    await this.listsRepo.manager.query(
      `UPDATE email_lists
       SET processed_count = processed_count + 1,
           ${resultCol} = ${resultCol} + 1
           ${disposableClause}
       WHERE id = $1`,
      [listId],
    );

    const list = await this.listsRepo.findOneOrFail({ where: { id: listId } });

    if (list.processedCount >= list.totalCount) {
      await this.listsRepo.update(listId, {
        status: EmailListStatus.COMPLETED,
      });
      list.status = EmailListStatus.COMPLETED;
    }

    return {
      processed: list.processedCount,
      total: list.totalCount,
      status: list.status,
    };
  }

  /**
   * Batch counterpart to incrementProcessed. ONE UPDATE bumps every counter
   * for a single list, and atomically flips status to COMPLETED when the
   * batch causes processed_count to reach total_count.
   *
   * Caller is expected to have already grouped batch results by listId
   * (a single batch usually has one listId anyway). The returned snapshot
   * is the post-update state — feed it directly into ProgressThrottler.
   */
  async incrementProcessedBatch(
    listId: string,
    d: ListDeltas,
  ): Promise<{ processed: number; total: number; status: EmailListStatus }> {
    const rows: Array<{
      processed: number;
      total: number;
      status: EmailListStatus;
    }> = await this.listsRepo.manager.query(
      `UPDATE email_lists
          SET processed_count  = processed_count  + $2,
              valid_count      = valid_count      + $3,
              invalid_count    = invalid_count    + $4,
              risky_count      = risky_count      + $5,
              unknown_count    = unknown_count    + $6,
              disposable_count = disposable_count + $7,
              status = CASE
                         WHEN processed_count + $2 >= total_count
                              AND status != 'COMPLETED'
                           THEN 'COMPLETED'::email_lists_status_enum
                         ELSE status
                       END
        WHERE id = $1
        RETURNING processed_count AS "processed",
                  total_count    AS "total",
                  status         AS "status"`,
      [
        listId,
        d.processed,
        d.valid,
        d.invalid,
        d.risky,
        d.unknown,
        d.disposable,
      ],
    );

    if (rows.length === 0) {
      // List was deleted between batch dispatch and DB write. Return a
      // synthetic snapshot so callers don't crash; the throttler will
      // simply emit a no-op final state.
      return {
        processed: 0,
        total: 0,
        status: EmailListStatus.FAILED,
      };
    }
    return rows[0];
  }

  async findById(id: string, userId: string): Promise<EmailList> {
    const list = await this.listsRepo.findOne({ where: { id, userId } });
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  async findByIdRaw(id: string): Promise<EmailList | null> {
    return this.listsRepo.findOne({ where: { id } });
  }

  /**
   * "Active" = the job the user is currently waiting on. That includes
   * lists that are still parsing or sitting in the queue (status=PENDING)
   * as well as ones whose verification has actually started
   * (status=PROCESSING). Without this, a freshly-uploaded list spends
   * the whole CSV-parse window invisible to the dashboard / progress UI.
   *
   * Sorted by createdAt DESC so the most recent upload wins when a user
   * has more than one in-flight (rare).
   */
  async findActiveJob(userId: string): Promise<EmailList | null> {
    return this.listsRepo.findOne({
      where: [
        { userId, status: EmailListStatus.PROCESSING },
        { userId, status: EmailListStatus.PENDING },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
    status?: EmailListStatus,
  ): Promise<[EmailList[], number]> {
    const where: Record<string, unknown> = { userId };
    if (status) where['status'] = status;
    return this.listsRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findEmailsInList(
    listId: string,
    userId: string,
    page: number,
    limit: number,
    result?: VerificationResult,
  ): Promise<[Email[], number]> {
    await this.findById(listId, userId);
    const where: Record<string, unknown> = { listId };
    if (result) where['verificationResult'] = result;
    return this.emailsRepo.findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async retryFailed(
    listId: string,
    userId: string,
  ): Promise<{ requeuedCount: number }> {
    const list = await this.findById(listId, userId);

    const failed = await this.emailsRepo.find({
      where: { listId, status: EmailStatus.FAILED },
      select: ['id'],
    });

    if (failed.length === 0) return { requeuedCount: 0 };

    const ids = failed.map((e) => e.id);
    await this.emailsRepo
      .createQueryBuilder()
      .update(Email)
      .set({ status: EmailStatus.QUEUED, errorMessage: null })
      .whereInIds(ids)
      .execute();

    // Reset list counters for failed jobs
    const failedCount = ids.length;
    await this.listsRepo.update(listId, {
      processedCount: list.processedCount - failedCount,
      status: EmailListStatus.PROCESSING,
      startedAt: new Date(),
    });

    return { requeuedCount: failedCount };
  }

  async streamDownload(
    listId: string,
    userId: string,
    res: Response,
    format: 'csv' | 'json',
    type: 'verified' | 'full',
  ): Promise<void> {
    const list = await this.findById(listId, userId);

    const qb = this.emailsRepo
      .createQueryBuilder('e')
      .select(['e.address', 'e.verificationResult', 'e.apiRawResponse'])
      .where('e.list_id = :listId', { listId })
      .andWhere('e.status = :status', { status: EmailStatus.COMPLETED });

    if (type === 'verified') {
      qb.andWhere('e.verification_result = :result', {
        result: VerificationResult.VALID,
      });
    }

    // Run the query first so any DB error surfaces *before* response headers
    // are written. Avoids ERR_HTTP_HEADERS_SENT when the global filter tries
    // to send a JSON error after we've already started the response.
    const rows = await qb.getMany();

    const toStatus = (r: string | null | undefined): string => {
      if (r === VerificationResult.VALID) return 'valid';
      if (r === VerificationResult.INVALID) return 'invalid';
      if (r === VerificationResult.RISKY) return 'risky';
      return 'unknown';
    };

    // Pull user + domain from the original MailTester response. Fall back to
    // parsing the address itself when the raw payload is missing those fields.
    type Report = {
      email: string;
      user: string;
      domain: string;
      status: string;
    };
    const buildRow = (r: {
      address: string;
      verificationResult: VerificationResult | null;
      apiRawResponse: Record<string, unknown> | null;
    }): Report => {
      const raw = r.apiRawResponse ?? {};
      const [localPart, addrDomain] = r.address.split('@');
      return {
        email: r.address,
        user: (typeof raw.user === 'string' && raw.user) || localPart || '',
        domain:
          (typeof raw.domain === 'string' && raw.domain) || addrDomain || '',
        status: toStatus(r.verificationResult),
      };
    };

    // Sort: valid first, then risky, then invalid, then unknown.
    const STATUS_ORDER: Record<string, number> = {
      valid: 0,
      risky: 1,
      invalid: 2,
      unknown: 3,
    };
    const report = rows
      .map(buildRow)
      .sort(
        (a, b) =>
          (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
      );

    // Use the original uploaded filename so downloads round-trip nicely
    // (`leads.csv` → `leads.csv`). Fall back to the list ID if absent.
    const baseName = (list.originalFilename ?? `bulk-${listId}`).replace(
      /\.[^.]+$/,
      '',
    );
    const safeBase = baseName.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const filename = `${safeBase}.${format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(report));
    } else {
      res.setHeader('Content-Type', 'text/csv');
      // Quote fields so commas inside `user` (e.g. "Doe, John") don't break the CSV.
      const escape = (v: string): string => `"${v.replace(/"/g, '""')}"`;
      const lines = ['email,user,domain,status'];
      for (const r of report) {
        lines.push(
          [escape(r.email), escape(r.user), escape(r.domain), r.status].join(
            ',',
          ),
        );
      }
      res.end(lines.join('\n'));
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const list = await this.findById(id, userId);
    await this.listsRepo.remove(list);
  }

  private parseFile(filePath: string): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const addresses: string[] = [];
      const seen = new Set<string>();
      let duplicates = 0;
      let detectedColumn = 'email';
      let isFirstRow = true;

      const parser = fs.createReadStream(filePath).pipe(
        parse({
          trim: true,
          skip_empty_lines: true,
          relax_column_count: true,
        }),
      );

      parser.on('data', (row: string[]) => {
        const raw = (row[0] ?? '').trim().toLowerCase();

        // Detect if first row is a header
        if (isFirstRow) {
          isFirstRow = false;
          if (!this.looksLikeEmail(raw)) {
            detectedColumn = raw || 'email';
            return; // skip header row
          }
        }

        if (!raw || !this.looksLikeEmail(raw)) return;

        if (seen.has(raw)) {
          duplicates++;
        } else {
          seen.add(raw);
          addresses.push(raw);
        }
      });

      parser.on('end', () =>
        resolve({ addresses, duplicates, detectedColumn }),
      );
      parser.on('error', reject);
    });
  }

  private looksLikeEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
}
