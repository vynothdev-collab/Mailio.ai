import type { BulkJobDto } from "@/src/types/bulk";

export type ResultType   = "single" | "bulk";
export type EmailStatus  = "valid" | "invalid" | "catchall";
export type CatchallLevel = "low" | "medium" | "high" | null;

export interface ResultRecord {
  id:           string;
  type:         ResultType;
  label:        string;
  status:       EmailStatus;
  catchall:     CatchallLevel;
  verifiedAt:   string;
  bulkJob?:     BulkJobDto;
}

export type StatusFilter = "all" | EmailStatus;
export type TypeFilter   = "all" | ResultType;

export interface ResultsFilters {
  query:      string;
  status:     StatusFilter;
  type:       TypeFilter;
  page:       number;
  pageSize:   number;
}
