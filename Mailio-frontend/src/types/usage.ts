export type UsagePeriod = "7d" | "14d" | "30d";
export type UsageType   = "all" | "single" | "bulk";

export interface UsageQuotaDto {
  plan:        "PRO" | "ULTIMATE" | string;
  used:        number;
  limit:       number;
  remaining:   number;
  percentage:  number;
  periodStart: string;
  periodEnd:   string;
  resetDate:   string;
}

export interface UsageBreakdownDto {
  single: number;
  bulk:   number;
  total:  number;
  period: UsagePeriod;
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
