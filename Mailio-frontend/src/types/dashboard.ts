// Dashboard API contracts.
//
// The backend has shipped two slightly different payload shapes:
//
//   v1 (spec):  riskyRate (%), avgResponseMs, invalidRate
//   v2 (live):  riskyEmails (count), no avg response, no invalid rate
//
// Both fields are optional here so the mapper can handle either without
// the type system fighting it.

export interface DashboardChanges {
  totalVerified?: string;
  validRate?:     string;
  /** v1 only */
  avgResponseMs?: string;
  /** v2 only */
  riskyEmails?:   string;
  /** sometimes present */
  riskyRate?:     string;
}

/** GET /dashboard/stats response (union of v1 + v2). */
export interface DashboardStatsResponse {
  totalVerified: number;
  validRate:     number;
  invalidRate?:  number; // v1
  riskyRate?:    number; // v1
  riskyEmails?:  number; // v2
  avgResponseMs?: number; // v1
  changes?:      DashboardChanges;
}

// ── Chart breakdown (donut on the Results Overview card) ───────────────────

export type DashboardChartPeriod = "7d" | "14d" | "30d";

export interface DashboardChartPoint {
  name:       string;
  value:      number;
  percentage: number;  // 0–100
  color:      string;  // hex
}

/** GET /dashboard/chart?period=… response. */
export interface DashboardChartResponse {
  data:  DashboardChartPoint[];
  total: number;
}

// ── Recent verifications (paginated table on the dashboard) ────────────────

export type RecentVerificationStatus = "valid" | "invalid" | "risky" | "unknown" | "disposable";
export type RecentVerificationRisk   = "low" | "medium" | "high" | "unknown";

export interface RecentVerificationItem {
  id:         string;
  email:      string;
  status:     RecentVerificationStatus;
  risk:       RecentVerificationRisk;
  verifiedAt: string; // ISO 8601
  isBulk:     boolean;
}

/** GET /dashboard/recent-verifications?page=&limit= response. */
export interface RecentVerificationsResponse {
  data:  RecentVerificationItem[];
  total: number;
  page:  number;
  limit: number;
}
