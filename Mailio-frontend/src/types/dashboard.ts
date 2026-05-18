interface DashboardChanges {
  totalVerified?: string;
  validRate?:     string;
  avgResponseMs?: string;
  riskyEmails?:   string;
  riskyRate?:     string;
}

export interface DashboardStatsResponse {
  totalVerified: number;
  validRate:     number;
  invalidRate?:  number;
  riskyRate?:    number;
  riskyEmails?:  number;
  avgResponseMs?: number;
  changes?:      DashboardChanges;
}

export type DashboardChartPeriod = "7d" | "14d" | "30d";

interface DashboardChartPoint {
  name:       string;
  value:      number;
  percentage: number;
  color:      string;
}

export interface DashboardChartResponse {
  data:  DashboardChartPoint[];
  total: number;
}

export type RecentVerificationStatus = "valid" | "invalid" | "risky" | "unknown" | "disposable";
export type RecentVerificationRisk   = "low" | "medium" | "high" | "unknown";

export interface RecentVerificationItem {
  id:         string;
  email:      string;
  status:     RecentVerificationStatus;
  risk:       RecentVerificationRisk;
  verifiedAt: string;
  isBulk:     boolean;
}

export interface RecentVerificationsResponse {
  data:  RecentVerificationItem[];
  total: number;
  page:  number;
  limit: number;
}
