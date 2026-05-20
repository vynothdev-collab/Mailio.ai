export type BulkJobStatus   = "pending" | "processing" | "completed" | "failed";
type BulkParseStatus = "PENDING" | "PARSING" | "PARSED" | "FAILED";

export interface BulkUploadResponse {
  jobId:       string;
  fileName:    string;
  parseStatus: BulkParseStatus;
  status:      BulkJobStatus | string;
}

export interface BulkActiveJobDto {
  jobId:          string;
  fileName:       string;
  progress:       number;
  processedCount: number;
  totalCount:     number;
  etaSeconds:     number;
  startedAt:      string | null;
  valid:          number;
  invalid:        number;
  risky:          number;
  disposable:     number;
}

export interface BulkJobDto {
  jobId:          string;
  fileName:       string;
  status:         BulkJobStatus;
  totalEmails:    number;
  processedCount: number;
  valid:          number;
  invalid:        number;
  risky:          number;
  disposable:     number;
  createdAt:      string;
  completedAt:    string | null;
}

export interface BulkJobsResponse {
  data:  BulkJobDto[];
  total: number;
  page:  number;
  limit: number;
}

export interface BulkStatsDto {
  filesToday:        number;
  currentJobEmails:  number;
  completedJobs:     number;
  apiUsage:          number;
  avgResponseMs:     number;
  successCount?:     number;
  invalidCount?:     number;
  riskCount?:        number;
  changes: {
    filesToday:    string;
    completedJobs: string;
    avgResponseMs: string;
  };
}

export interface BulkProgressDto {
  progress:       number;
  processedCount: number;
  totalCount:     number;
  etaSeconds:     number;
  valid:          number;
  invalid:        number;
  risky:          number;
  disposable:     number;
}

export interface BulkBreakdownDto {
  data: {
    name:       string;
    value:      number;
    percentage: number;
    color:      string;
  }[];
  total: number;
}

export interface ProgressEvent {
  listId:    string;
  processed: number;
  total:     number;
  pct:       number;
}

export interface ListStatusChangeEvent {
  listId: string;
  status: string;
}
