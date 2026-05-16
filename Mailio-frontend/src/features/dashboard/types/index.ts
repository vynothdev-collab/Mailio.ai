// ── Enums ──────────────────────────────────────────────────────────────────

export type VerificationStatus = "processing" | "completed" | "failed" | "queued";

// ── Stat card ──────────────────────────────────────────────────────────────

export interface StatItem {
  id: string;
  label: string;
  value: string;
  change: number;        // positive = up, negative = down, 0 = neutral
  changePeriod: string;
  iconName: string;      // Lucide icon component name
  iconColor: string;     // Tailwind text class
  iconBgColor: string;   // Tailwind bg class
}

// ── Active verification job ────────────────────────────────────────────────

export interface ActiveVerification {
  fileName: string;
  progress: number;       // 0–100
  processedCount: number;
  totalCount: number;
  etaSeconds: number;
  startedAt: string;
  valid: number;
  invalid: number;
  risky: number;
  disposable: number;
}

// ── Verification history record ────────────────────────────────────────────

export interface VerificationRecord {
  id: string;
  fileName: string;
  totalEmails: number;
  status: VerificationStatus;
  valid: number | null;
  invalid: number | null;
  risky: number | null;
  disposable: number | null;
  startedAt: string;
  completedAt: string | null;
}

// ── Chart ──────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  name: string;
  value: number;
  percentage: string;
  color: string;
}

// ── Aggregated dashboard data ──────────────────────────────────────────────

export interface DashboardData {
  stats: StatItem[];
  activeVerification: ActiveVerification | null;
  recentVerifications: VerificationRecord[];
  chartData: ChartDataPoint[];
  chartTotal: number;
}

// ── Nav ────────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
}

// ── Usage bar ─────────────────────────────────────────────────────────────

export interface UsageInfo {
  used: number;
  total: number;
  plan: string;
}
