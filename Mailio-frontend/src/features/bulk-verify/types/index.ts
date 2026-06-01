export type JobStatus = "processing" | "completed" | "failed" | "queued";

export interface FilePreview {
  name:            string;
  totalEmails:     number;
  duplicates:      number;
  detectedColumn:  string;
}

export interface BulkActiveJob {
  fileName:       string;
  uploadedAt:     string;
  progress:       number;
  processedCount: number;
  totalCount:     number;
  etaSeconds:     number;
  startedAt:      string;
  valid:          number;
  invalid:        number;
  catchall:          number;
  disposable:     number;
}

export interface BulkVerificationRecord {
  id:          string;
  fileName:    string;
  totalEmails: number;
  status:      JobStatus;
  valid:       number | null;
  invalid:     number | null;
  catchall:       number | null;
  disposable:  number | null;
}

export interface BulkStat {
  id:           string;
  label:        string;
  value:        string;
  subLabel:     string;
  change:       number;
  iconName:     string;
  iconColor:    string;
  iconBgColor:  string;
}
