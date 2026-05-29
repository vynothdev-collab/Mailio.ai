export interface EmailVerificationJobPayload {
  emailId: string;
  userId: string;
  listId?: string;
  stride?: number;
}

export interface EmailBatchJobPayload {
  batchId: string;
  userId: string;
  listId: string;
  emailIds: string[];
  stride?: number;
  // How many full reverify cycles this batch has already burned through.
  // Each cycle = BULL_MAX_RETRIES attempts inside processBatch. After
  // MAX_REVERIFY_CYCLES the failed emails finally fall through to
  // failure-batch (UNKNOWN). Undefined / 0 = first cycle.
  reverifyCycle?: number;
}
