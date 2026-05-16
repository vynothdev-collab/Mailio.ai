export interface EmailVerificationJobPayload {
  emailId: string;
  userId: string;
  listId?: string;
}

/**
 * Micro-batch payload for verify.bulk. One BullMQ job carries N emailIds
 * (typically 25–100) instead of one. Reduces Redis/BullMQ overhead,
 * collapses per-email DB writes into single batched SQL, and lets the
 * worker run inner-parallel Ninja calls against KeyPool.
 *
 * batchId is a uuid used for:
 *   - BullMQ-level dedupe (`bulk-batch-${batchId}` jobId)
 *   - downstream db.write dedupe (`ok-batch-${batchId}` / `fail-batch-${batchId}`)
 *   - log/trace correlation
 */
export interface EmailBatchJobPayload {
  batchId: string;
  userId: string;
  listId: string;
  emailIds: string[];
}
