import { Plan } from '../users/entities/user.entity';

export const CSV_PARSE_QUEUE = 'csv.parse';

export interface CsvParseJob {
  listId: string;
  userId: string;
  plan: Plan;
  filePath: string;
  originalFilename: string;
}
