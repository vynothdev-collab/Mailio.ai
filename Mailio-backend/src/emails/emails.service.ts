import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationResult } from '../common/types/verification-result.enum';
import { BatchFailureRow, BatchSuccessRow } from '../db-write/db-write.types';
import { Email, EmailStatus } from './entities/email.entity';

/** Minimal projection returned by tryClaimMany — only what the worker needs. */
export interface ClaimedEmailRow {
  id: string;
  address: string;
  userId: string;
  listId: string | null;
  isSingleVerify: boolean;
}

/** Projection returned by saveResultsBatch / markFailedBatch. */
export interface TransitionedRow {
  emailId: string;
  listId: string | null;
  result: VerificationResult | null;
  disposable: boolean | null;
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

  /**
   * Look up an email row.
   * When `userId` is supplied (HTTP path) the row is scoped to that user so
   * one user can't fetch another user's verification by guessing the UUID.
   * The unscoped overload is retained for internal callers like the queue
   * processor that already trust the job payload.
   */
  async findById(id: string, userId?: string): Promise<Email> {
    const where: Record<string, unknown> = { id };
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
      where: { userId, isSingleVerify: true },
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

  /**
   * Atomic claim for the worker. Marks the email as PROCESSING for any
   * status that isn't already COMPLETED — this lets BullMQ retries pick
   * up emails that previously failed (status=FAILED) or got stuck mid-
   * processing (status=PROCESSING from a crashed prior attempt).
   *
   * COMPLETED rows are NOT re-claimed — that protects against retries
   * re-billing a successful verification (the saveResult conditional
   * update is the second layer of that safety net).
   */
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

  /**
   * Persist a verification result. Returns `true` only when this call
   * actually moved the row from non-COMPLETED to COMPLETED — callers use
   * that signal to decide whether to bump the list's per-result counters.
   * If the row was already COMPLETED (e.g. retried job), returns false and
   * leaves everything alone.
   */
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

  /**
   * Revert a PROCESSING claim back to QUEUED. Used when the worker grabbed
   * the row but then couldn't proceed (e.g. global rate-limit denied the
   * MailTester slot) — without this the next retry would see status=
   * PROCESSING and silently skip the email forever.
   *
   * Only PROCESSING rows are touched. COMPLETED / FAILED rows are left
   * alone so this is safe to call defensively.
   */
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

  // ── BATCH METHODS ─────────────────────────────────────────────────────
  // Used by VerificationBatchProcessor + DbWriteProcessor batch handlers.
  // Each replaces N per-row UPDATEs with a single set-based statement,
  // reducing Postgres lock churn and round-trip cost. Idempotency rules
  // are identical to the per-row variants (status != COMPLETED guard).

  /**
   * Atomic claim for a set of email ids. Returns ONLY the rows that
   * actually transitioned to PROCESSING (already-COMPLETED rows are
   * filtered out by the WHERE clause). One round trip; one row-level lock
   * acquired per emailId in PG.
   */
  async tryClaimMany(
    emailIds: string[],
    bullJobId: string,
  ): Promise<ClaimedEmailRow[]> {
    if (emailIds.length === 0) return [];

    // Explicit ::emails_status_enum casts on every enum parameter — pg
    // delivers $2/$4 as text, and Postgres won't implicit-cast text into
    // an enum column (only string LITERALS auto-cast as "unknown" type).
    // Without the cast you get: "column 'status' is of type
    // emails_status_enum but expression is of type text".
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

  /**
   * Revert PROCESSING → QUEUED for a set of rows. Used when the batch
   * worker grabbed the rows but a downstream step (rate-limit, partial
   * failure) means those specific emails must retry. COMPLETED / FAILED
   * rows are left alone so this is safe to call defensively.
   */
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

  /**
   * Persist a batch of verification results in ONE UPDATE using UNNEST.
   * Returns the rows that actually transitioned to COMPLETED so the
   * caller can bump per-list counters exactly once per real transition.
   *
   * Postgres planner sees one query, one plan, one set of row locks —
   * vs. N separate UPDATEs that each pay round-trip + plan cost.
   */
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

    // status + verification_result are PG enums. `u.result` arrives as text
    // (from UNNEST(...::text[])), and pg won't implicit-cast text → enum.
    // The string literal 'COMPLETED' would auto-cast as "unknown", but we
    // keep an explicit cast for symmetry / readability.
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

  /**
   * Batch counterpart to markFailed. Returns transitioned rows so the
   * caller can bump per-list counters (failed emails count as UNKNOWN
   * in the user-facing breakdown — matches the single-row failure path).
   */
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
