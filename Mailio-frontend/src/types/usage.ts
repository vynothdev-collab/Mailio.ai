export type UsagePeriod = "7d" | "14d" | "30d";
export type UsageType   = "all" | "single" | "bulk";

export interface UsageQuotaDto {
  plan:          "PRO" | "ULTIMATE" | string;
  accountLabel:  string;   // "Personal" | "Enterprise"
  creditBalance: number;   // remaining credits
  creditsUsed:   number;   // lifetime credits consumed
  percentage:    number;   // creditsUsed / total * 100
  periodStart:   string;
  periodEnd:     string;
  resetDate:     string;
  // legacy — kept for backwards compat
  used:          number;
  limit:         number;
  remaining:     number;
}

export interface UsageBreakdownDto {
  single:        number;   // count of single verify emails
  bulk:          number;   // count of bulk jobs
  total:         number;
  singleCredits: number;   // credits consumed by single verify
  bulkCredits:   number;   // credits consumed by bulk verify
  totalCredits:  number;
  period:        UsagePeriod;
}

export interface UsageChartPoint {
  date:   string;
  single: number;
  bulk:   number;
}

export interface UsageLogItem {
  id:         string;
  type:       "single" | "bulk";
  label:      string;
  credits:    number;
  occurredAt: string;
}

export interface UsageLogResponse {
  data:  UsageLogItem[];
  total: number;
  page:  number;
  limit: number;
}
