import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationResult } from '../common/types/verification-result.enum';
import { BatchFailureRow, BatchSuccessRow } from '../db-write/db-write.types';
import { Email, EmailStatus } from './entities/email.entity';

export interface ClaimedEmailRow {
  id: string;
  address: string;
  userId: string;
  listId: string | null;
  isSingleVerify: boolean;
}

export interface TransitionedRow {
  emailId: string;
  listId: string | null;
  result: VerificationResult | null;
  disposable: boolean | null;
}

export interface CachedVerificationRow {
  address: string;
  result: VerificationResult;
  score: number | null;
  mxFound: boolean | null;
  smtpCheck: boolean | null;
  disposable: boolean | null;
  catchAll: boolean | null;
  freeProvider: boolean | null;
  apiRawResponse: Record<string, unknown> | null;
  processedAt: Date;
}

@Injectable()
export class EmailsService {
  constructor(
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
  ) {}

  async createSingle(address: string, userId: string): Promise<Email> {
    const email = this.emailsRepo.create({
      address,
      userId,
      isSingleVerify: true,
      status: EmailStatus.QUEUED,
    });
    return this.emailsRepo.save(email);
  }

  async findById(id: string, userId?: string): Promise<Email> {
    const where: Record<string, unknown> = { id, isDeleted: false };
    if (userId) where.userId = userId;
    const email = await this.emailsRepo.findOne({ where });
    if (!email) throw new NotFoundException('Email not found');
    return email;
  }

  async findSinglesByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<[Email[], number]> {
    return this.emailsRepo.findAndCount({
      where: { userId, isSingleVerify: true, isDeleted: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async updateStatus(
    id: string,
    status: EmailStatus,
    extra: Partial<Email> = {},
  ): Promise<void> {
    await this.emailsRepo.update(id, { status, ...extra } as any);
  }

  async tryClaim(id: string, bullJobId: string): Promise<Email | null> {
    const result = await this.emailsRepo
      .createQueryBuilder()
      .update(Email)
      .set({ status: EmailStatus.PROCESSING, bullJobId })
      .where('id = :id AND status != :completed', {
        id,
        completed: EmailStatus.COMPLETED,
      })
      .execute();

    if (!result.affected) return null;
    return this.emailsRepo.findOne({ where: { id } });
  }

  async saveResult(
    id: string,
    data: {
      verificationResult: VerificationResult;
      score: number;
      mxFound: boolean;
      smtpCheck: boolean;
      disposable: boolean;
      catchAll: boolean | null;
      freeProvider: boolean;
      apiRawResponse: Record<string, unknown>;
      durationMs: number;
      processedAt: Date;
    },
  ): Promise<boolean> {
    const result = await this.emailsRepo
      .createQueryBuilder()
      .update(Email)
      .set({ status: EmailStatus.COMPLETED, ...data } as any)
      .where('id = :id AND status != :completed', {
        id,
        completed: EmailStatus.COMPLETED,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async releaseClaim(id: string): Promise<void> {
    await this.emailsRepo
      .createQueryBuilder()
      .update(Email)
      .set({ status: EmailStatus.QUEUED, bullJobId: null })
      .where('id = :id AND status = :processing', {
        id,
        processing: EmailStatus.PROCESSING,
      })
      .execute();
  }

  async markFailed(id: string, errorMessage: string): Promise<boolean> {
    const result = await this.emailsRepo
      .createQueryBuilder()
      .update(Email)
      .set({ status: EmailStatus.FAILED, errorMessage })
      .where('id = :id AND status != :completed AND status != :failed', {
        id,
        completed: EmailStatus.COMPLETED,
        failed: EmailStatus.FAILED,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  /**
   * Look up the freshest COMPLETED verification per address from any user.
   * Used as a cache to skip the Ninja API call when the same address has
   * already been verified recently. Returns a Map keyed by address (lowercase).
   *
   * The query relies on the partial index idx_emails_address_completed.
   */
  async findRecentResultsByAddress(
    addresses: string[],
    maxAgeMs: number,
  ): Promise<Map<string, CachedVerificationRow>> {
    const out = new Map<string, CachedVerificationRow>();
    if (addresses.length === 0 || maxAgeMs <= 0) return out;

    // Dedupe + normalise (addresses are already inserted lower-cased by the
    // CSV parser, but we play it safe).
    const lowered = Array.from(
      new Set(addresses.map((a) => a.toLowerCase())),
    );

    const cutoff = new Date(Date.now() - maxAgeMs);

    type Row = {
      address: string;
      result: VerificationResult;
      score: number | null;
      mx_found: boolean | null;
      smtp_check: boolean | null;
      disposable: boolean | null;
      catch_all: boolean | null;
      free_provider: boolean | null;
      api_raw_response: Record<string, unknown> | null;
      processed_at: Date;
    };

    const rows: Row[] = await this.emailsRepo.manager.query(
      `SELECT DISTINCT ON (address)
              address,
              verification_result AS result,
              score,
              mx_found,
              smtp_check,
              disposable,
              catch_all,
              free_provider,
              api_raw_response,
              processed_at
         FROM emails
        WHERE address = ANY($1::text[])
          AND status = 'COMPLETED'::emails_status_enum
          AND is_deleted = false
          AND verification_result IS NOT NULL
          AND processed_at IS NOT NULL
          AND processed_at >= $2::timestamptz
        ORDER BY address, processed_at DESC`,
      [lowered, cutoff],
    );

    for (const r of rows) {
      out.set(r.address, {
        address: r.address,
        result: r.result,
        score: r.score,
        mxFound: r.mx_found,
        smtpCheck: r.smtp_check,
        disposable: r.disposable,
        catchAll: r.catch_all,
        freeProvider: r.free_provider,
        apiRawResponse: r.api_raw_response,
        processedAt: r.processed_at,
      });
    }
    return out;
  }

  async tryClaimMany(
    emailIds: string[],
    bullJobId: string,
  ): Promise<ClaimedEmailRow[]> {
    if (emailIds.length === 0) return [];

    const rows: ClaimedEmailRow[] = await this.emailsRepo.manager.query(
      `UPDATE emails
          SET status = $2::emails_status_enum,
              bull_job_id = $3
        WHERE id = ANY($1::uuid[])
          AND status != $4::emails_status_enum
        RETURNING id,
                  address,
                  user_id        AS "userId",
                  list_id        AS "listId",
                  is_single_verify AS "isSingleVerify"`,
      [emailIds, EmailStatus.PROCESSING, bullJobId, EmailStatus.COMPLETED],
    );

    return rows;
  }

  async releaseClaimMany(emailIds: string[]): Promise<void> {
    if (emailIds.length === 0) return;

    await this.emailsRepo.manager.query(
      `UPDATE emails
          SET status = $2::emails_status_enum, bull_job_id = NULL
        WHERE id = ANY($1::uuid[])
          AND status = $3::emails_status_enum`,
      [emailIds, EmailStatus.QUEUED, EmailStatus.PROCESSING],
    );
  }

  async saveResultsBatch(rows: BatchSuccessRow[]): Promise<TransitionedRow[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.emailId);
    const results = rows.map((r) => r.result);
    const scores = rows.map((r) => r.score);
    const mxs = rows.map((r) => r.mxFound);
    const smtps = rows.map((r) => r.smtpCheck);
    const disposes = rows.map((r) => r.disposable);
    const catchAlls = rows.map((r) => r.catchAll);
    const frees = rows.map((r) => r.freeProvider);
    const raws = rows.map((r) => JSON.stringify(r.apiRawResponse));
    const durations = rows.map((r) => r.durationMs);
    const processed = rows.map((r) => r.processedAt);

    const transitioned: TransitionedRow[] = await this.emailsRepo.manager.query(
      `UPDATE emails AS e
          SET status              = 'COMPLETED'::emails_status_enum,
              verification_result = u.result::emails_verification_result_enum,
              score               = u.score,
              mx_found            = u.mx_found,
              smtp_check          = u.smtp_check,
              disposable          = u.disposable,
              catch_all           = u.catch_all,
              free_provider       = u.free_provider,
              api_raw_response    = u.raw::jsonb,
              duration_ms         = u.duration_ms,
              processed_at        = u.processed_at::timestamptz
         FROM UNNEST(
                $1::uuid[],
                $2::text[],
                $3::int[],
                $4::bool[],
                $5::bool[],
                $6::bool[],
                $7::bool[],
                $8::bool[],
                $9::text[],
                $10::int[],
                $11::text[]
              ) AS u(
                id, result, score, mx_found, smtp_check,
                disposable, catch_all, free_provider, raw,
                duration_ms, processed_at
              )
        WHERE e.id = u.id
          AND e.status != 'COMPLETED'::emails_status_enum
       RETURNING e.id                  AS "emailId",
                 e.list_id             AS "listId",
                 e.verification_result AS "result",
                 e.disposable          AS "disposable"`,
      [
        ids,
        results,
        scores,
        mxs,
        smtps,
        disposes,
        catchAlls,
        frees,
        raws,
        durations,
        processed,
      ],
    );

    return transitioned;
  }

  async markFailedBatch(rows: BatchFailureRow[]): Promise<TransitionedRow[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.emailId);
    const msgs = rows.map((r) => r.errorMessage);

    const transitioned: TransitionedRow[] = await this.emailsRepo.manager.query(
      `UPDATE emails AS e
          SET status        = 'FAILED'::emails_status_enum,
              error_message = u.msg
         FROM UNNEST($1::uuid[], $2::text[]) AS u(id, msg)
        WHERE e.id = u.id
          AND e.status NOT IN (
                'COMPLETED'::emails_status_enum,
                'FAILED'::emails_status_enum
              )
       RETURNING e.id      AS "emailId",
                 e.list_id AS "listId",
                 NULL::text AS "result",
                 e.disposable AS "disposable"`,
      [ids, msgs],
    );

    return transitioned;
  }
}
