import type { BulkJobDto } from "@/src/types/bulk";

export type ResultType   = "single" | "bulk";
export type EmailStatus  = "valid" | "invalid" | "risky";
export type RiskLevel    = "low" | "medium" | "high" | null;

export interface ResultRecord {
  id:           string;
  type:         ResultType;
  label:        string;        // email for single, file name for bulk
  status:       EmailStatus;
  risk:         RiskLevel;
  verifiedAt:   string;
  /** Original bulk job — present only when type === "bulk". Used by the
   *  View dialog to fetch the job's per-row results. */
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
