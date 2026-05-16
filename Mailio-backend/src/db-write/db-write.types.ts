import { VerificationResult } from '../common/types/verification-result.enum';

export const DB_WRITE_QUEUE = 'db.write';

/**
 * Funnels both happy and final-failure paths through one queue so that the
 * verification worker's `process()` is purely:
 *
 *     claim → call provider → enqueue db.write → ACK
 *
 * The DB writer owns email row mutation, list-counter increments, gateway
 * emits, and the bulk "now-serving" advance. If Postgres is unavailable,
 * jobs back up in `db.write` and the rate-limited provider is left alone.
 *
 * Per-email kinds ('success' / 'failure') are retained for the verify.high
 * single-verify path and for rollback compatibility. The batch kinds
 * ('success-batch' / 'failure-batch') carry N rows in one job and are
 * emitted by the new VerificationBatchProcessor.
 */
export type DbWriteJob =
  | DbWriteSuccessJob
  | DbWriteFailureJob
  | DbWriteSuccessBatchJob
  | DbWriteFailureBatchJob;

export interface DbWriteSuccessJob {
  kind: 'success';
  emailId: string;
  userId: string;
  listId: string | null;
  isSingleVerify: boolean;
  /** Key id of the credential that produced this result (audit / metrics). */
  providerKeyId: string;
  result: VerificationResult;
  score: number;
  mxFound: boolean;
  smtpCheck: boolean;
  disposable: boolean;
  catchAll: boolean | null;
  freeProvider: boolean;
  apiRawResponse: Record<string, unknown>;
  durationMs: number;
  processedAt: string; // ISO so the payload survives JSON round-tripping
  /** Echo of provider response fields needed for the WebSocket single-result emit. */
  emailAddress: string;
}

export interface DbWriteFailureJob {
  kind: 'failure';
  emailId: string;
  userId: string;
  listId: string | null;
  isSingleVerify: boolean;
  errorMessage: string;
}

/**
 * One row inside a success batch. Mirrors DbWriteSuccessJob fields minus
 * the per-row routing data (userId / listId / kind) which are common to
 * the whole batch.
 */
export interface BatchSuccessRow {
  emailId: string;
  emailAddress: string;
  isSingleVerify: boolean;
  providerKeyId: string;
  result: VerificationResult;
  score: number;
  mxFound: boolean;
  smtpCheck: boolean;
  disposable: boolean;
  catchAll: boolean | null;
  freeProvider: boolean;
  apiRawResponse: Record<string, unknown>;
  durationMs: number;
  processedAt: string;
}

export interface DbWriteSuccessBatchJob {
  kind: 'success-batch';
  batchId: string;
  userId: string;
  listId: string;
  rows: BatchSuccessRow[];
}

export interface BatchFailureRow {
  emailId: string;
  errorMessage: string;
}

export interface DbWriteFailureBatchJob {
  kind: 'failure-batch';
  batchId: string;
  userId: string;
  listId: string;
  rows: BatchFailureRow[];
}
