import { VerificationResult } from '../common/types/verification-result.enum';

export const DB_WRITE_QUEUE = 'db.write';

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
