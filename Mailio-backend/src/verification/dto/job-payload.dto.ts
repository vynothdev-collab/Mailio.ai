export interface EmailVerificationJobPayload {
  emailId: string;
  userId: string;
  listId?: string;
}

export interface EmailBatchJobPayload {
  batchId: string;
  userId: string;
  listId: string;
  emailIds: string[];
}
