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
}
