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

export type RecentVerificationStatus = "queued" | "pending" | "completed" | "failed";

export interface RecentVerificationItem {
  id:         string;
  label:      string;
  email:      string;
  isBulk:     boolean;
  status:     RecentVerificationStatus;
  verifiedAt: string;
}

export interface RecentVerificationsResponse {
  data:  RecentVerificationItem[];
  total: number;
  page:  number;
  limit: number;
}
