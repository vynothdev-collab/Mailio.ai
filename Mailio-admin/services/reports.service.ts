import { apiService } from "./api";

export type AudienceTab = "single" | "enterprise";
export type Period = "today" | "7d" | "30d" | "90d" | "custom";

export interface DeltaStat {
  value: number;
  deltaPct: number;
}

export interface ReportsSummary {
  range: { from: string; to: string; days: number };
  stats: {
    totalVerifications: DeltaStat;
    validRate: DeltaStat;
    creditsUsed: DeltaStat;
    revenue: DeltaStat & { currency: string };
    offerRedemptions: DeltaStat;
  };
}

export interface VerificationTrendPoint {
  date: string;
  total: number;
  valid: number;
  invalid: number;
  catchall: number;
  failed: number;
}

export interface ReportsVerifications {
  trend: VerificationTrendPoint[];
  breakdown: {
    valid: number;
    invalid: number;
    catchall: number;
    failed: number;
    total: number;
  };
  totals: { total: number; valid: number; invalid: number; failed: number };
}

export interface ReportsDistribution {
  creditsByPlan: Array<{
    planId: string | null;
    planName: string;
    credits: number;
    pct: number;
  }>;
  signupsTrend: Array<{ date: string; singleUsers: number; enterprises: number }>;
  signupsTotals: {
    singleUsers: number;
    singleUsersDeltaPct: number;
    enterprises: number;
    enterprisesDeltaPct: number;
  };
}

interface QueryParams {
  tab: AudienceTab;
  period: Period;
  from?: string;
  to?: string;
}

function qs({ tab, period, from, to }: QueryParams) {
  const p = new URLSearchParams({ tab, period });
  if (from) p.set("from", from);
  if (to)   p.set("to", to);
  return p.toString();
}

export const reportsService = {
  summary: (params: QueryParams) =>
    apiService.get<ReportsSummary>(`/admin/reports/summary?${qs(params)}`),

  verifications: (params: QueryParams) =>
    apiService.get<ReportsVerifications>(`/admin/reports/verifications?${qs(params)}`),

  distribution: (params: QueryParams) =>
    apiService.get<ReportsDistribution>(`/admin/reports/distribution?${qs(params)}`),
};
