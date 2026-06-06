export type UsagePeriod = "7d" | "14d" | "30d";
export type UsageType = "all" | "single" | "bulk";

export interface UsageQuotaDto {
  plan: "PRO" | "ULTIMATE" | string;
  currentPlanId: string | null;
  accountLabel: string;
  creditBalance: number;
  creditsUsed: number;
  percentage: number;
  periodStart: string;
  periodEnd: string;
  resetDate: string;

  used: number;
  limit: number;
  remaining: number;
}

export interface UsageBreakdownDto {
  single: number;
  bulk: number;
  total: number;
  singleCredits: number;
  bulkCredits: number;
  totalCredits: number;
  period: UsagePeriod;
}

export interface UsageChartPoint {
  date: string;
  single: number;
  bulk: number;
}

export interface UsageLogItem {
  id: string;
  type: "single" | "bulk";
  label: string;
  credits: number;
  occurredAt: string;
}

export interface UsageLogResponse {
  data: UsageLogItem[];
  total: number;
  page: number;
  limit: number;
}
