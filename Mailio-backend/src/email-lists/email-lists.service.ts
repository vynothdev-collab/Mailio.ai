import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import type { Response } from 'express';
import { In, Repository } from 'typeorm';
import { DataScopeService } from '../common/scope/data-scope.service';
import { VerificationResult } from '../common/types/verification-result.enum';
import { Email, EmailStatus } from '../emails/entities/email.entity';
import { User } from '../users/entities/user.entity';
import { EmailList, EmailListStatus } from './entities/email-list.entity';

const CHUNK_SIZE = 500;

interface ParseResult {
  addresses: string[];
  duplicates: number;
  detectedColumn: string;
}

export interface ListDeltas {
  processed: number;
  valid: number;
  invalid: number;
  catchall: number;
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
    private readonly scope: DataScopeService,
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
      [VerificationResult.CATCHALL]: 'catchall_count',
      [VerificationResult.UNKNOWN]: 'unknown_count',
    }[result];

    const disposableInc = isDisposable ? 1 : 0;

    const rows: Array<{
      processed: number;
      total: number;
      status: EmailListStatus;
    }> = await this.listsRepo.manager.query(
      `UPDATE email_lists
          SET processed_count  = processed_count + 1,
              ${resultCol}     = ${resultCol} + 1,
              disposable_count = disposable_count + $2,
              status = CASE
                         WHEN processed_count + 1 >= total_count
                              AND status != 'COMPLETED'
                           THEN 'COMPLETED'::email_lists_status_enum
                         ELSE status
                       END
        WHERE id = $1
        RETURNING processed_count AS "processed",
                  total_count    AS "total",
                  status         AS "status"`,
      [listId, disposableInc],
    );

    if (rows.length === 0) {
      return { processed: 0, total: 0, status: EmailListStatus.FAILED };
    }
    return rows[0];
  }

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
              catchall_count      = catchall_count      + $5,
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
        d.catchall,
        d.unknown,
        d.disposable,
      ],
    );

    if (rows.length === 0) {
      return {
        processed: 0,
        total: 0,
        status: EmailListStatus.FAILED,
      };
    }
    return rows[0];
  }

  async findById(id: string, userId: string): Promise<EmailList> {
    const list = await this.listsRepo.findOne({
      where: { id, userId, isDeleted: false },
    });
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  /**
   * Endpoint-facing variant that lets an ENTERPRISE_ADMIN read any list
   * belonging to a user in their enterprise.
   */
  async findByIdForUser(id: string, user: User): Promise<EmailList> {
    const userIds = await this.scope.resolveUserIds(user);
    const list = await this.listsRepo.findOne({
      where: { id, userId: In(userIds), isDeleted: false },
    });
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  async findByIdRaw(id: string): Promise<EmailList | null> {
    return this.listsRepo.findOne({ where: { id } });
  }

  async findActiveJob(userId: string): Promise<EmailList | null> {
    return this.listsRepo.findOne({
      where: [
        { userId, isDeleted: false, status: EmailListStatus.PROCESSING },
        { userId, isDeleted: false, status: EmailListStatus.PENDING },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(
    user: User,
    page: number,
    limit: number,
    status?: EmailListStatus,
  ): Promise<[EmailList[], number]> {
    const userIds = await this.scope.resolveUserIds(user);
    const where: Record<string, unknown> = {
      userId: In(userIds),
      isDeleted: false,
    };
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
    user: User,
    page: number,
    limit: number,
    result?: VerificationResult,
  ): Promise<[Email[], number]> {
    await this.findByIdForUser(listId, user);
    const where: Record<string, unknown> = { listId, isDeleted: false };
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
    user: User,
  ): Promise<{ requeuedCount: number }> {
    const list = await this.findByIdForUser(listId, user);

    const failed = await this.emailsRepo.find({
      where: { listId, status: EmailStatus.FAILED, isDeleted: false },
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
    user: User,
    res: Response,
    format: 'csv' | 'json',
    type: 'verified' | 'full',
  ): Promise<void> {
    const list = await this.findByIdForUser(listId, user);

    const qb = this.emailsRepo
      .createQueryBuilder('e')
      .select(['e.address', 'e.verificationResult', 'e.apiRawResponse'])
      .where('e.list_id = :listId', { listId })
      .andWhere('e.is_deleted = FALSE');

    if (type === 'verified') {
      qb.andWhere('e.status = :status', { status: EmailStatus.COMPLETED });
      qb.andWhere('e.verification_result = :result', {
        result: VerificationResult.VALID,
      });
    } else {
      qb.andWhere('e.status IN (:...statuses)', {
        statuses: [EmailStatus.COMPLETED, EmailStatus.FAILED],
      });
    }

    const rows = await qb.getMany();

    const toStatus = (r: string | null | undefined): string => {
      if (r === VerificationResult.VALID) return 'valid';
      if (r === VerificationResult.INVALID) return 'invalid';
      if (r === VerificationResult.CATCHALL) return 'catchall';
      return 'catchall';
    };

    
    
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

    
    const STATUS_ORDER: Record<string, number> = {
      valid: 0,
      catchall: 1,
      invalid: 2,
      unknown: 3,
    };
    const report = rows
      .map(buildRow)
      .sort(
        (a, b) =>
          (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
      );

    
    
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

  async remove(id: string, user: User): Promise<void> {
    const list = await this.findByIdForUser(id, user);
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
