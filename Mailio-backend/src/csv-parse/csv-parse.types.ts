import { Plan } from '../users/entities/user.entity';

export const CSV_PARSE_QUEUE = 'csv.parse';

/**
 * Enqueued by BulkVerifyController immediately after the upload arrives.
 * Carries everything the worker needs to parse the file, gate on quota,
 * insert rows, and enqueue verify jobs — no DB read of the file metadata
 * is required by the processor itself.
 *
 * filePath is a server-local disk path (Multer writes there). The
 * processor unlinks it after the stream ends regardless of outcome.
 */
export interface CsvParseJob {
  listId: string;
  userId: string;
  plan: Plan;
  filePath: string;
  originalFilename: string;
}
