/**
 * Dashboard data aggregator.
 *
 * Stats now come from the live API (GET /dashboard/stats) and are mapped
 * into the existing `StatItem[]` shape so the UI doesn't change.
 * Other sections (active job, recent verifications, chart) still use mocks
 * because no backend endpoint exists for them yet — swap in a real call
 * the moment one ships.
 */

import { dashboardService as apiDashboardService } from "@/src/services/dashboardService";
import type {
  DashboardChartResponse,
  DashboardStatsResponse,
} from "@/src/types/dashboard";
import type { BulkActiveJobDto } from "@/src/types/bulk";
import type { ApiError } from "@/src/types/auth";
import type {
  ActiveVerification,
  ChartDataPoint,
  DashboardData,
  StatItem,
} from "../types";
import { MOCK_RECENT_VERIFICATIONS } from "../mock/verifications";

// ── Helpers ────────────────────────────────────────────────────────────────

const CHANGE_PERIOD = "vs previous period";

/**
 * Backend sends changes as strings ("+12%", "-5%"). Convert to a signed
 * number so the existing StatCard up/down/neutral logic works unchanged.
 */
function parseChange(change?: string): number {
  if (!change) return 0;
  const cleaned = change.replace("%", "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function formatPercent(n: number): string {
  // 78.5 → "78.5%"
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

/**
 * Map the API response → the StatItem[] the dashboard cards already render.
 *
 * The third card adapts to whichever risky field the backend sends:
 *   - `riskyRate`   (percent) → "Risky Rate" with "%"
 *   - `riskyEmails` (count)   → "Risky Emails" as a count
 * The fourth card is only emitted when avgResponseMs is present, so the
 * existing 3-column grid still looks correct when the field is missing.
 */
function mapStats(res: DashboardStatsResponse): StatItem[] {
  // Period-over-period delta is hidden on these tiles — pass empty changePeriod
  // so StatCard can suppress the bottom row entirely.
  return [
    {
      id:           "total-verified",
      label:        "Total Verified",
      value:        formatInt(res.totalVerified ?? 0),
      change:       0,
      changePeriod: "",
      iconName:     "Mail",
      iconColor:    "text-blue-600",
      iconBgColor:  "bg-blue-50",
    },
    {
      id:           "valid-rate",
      label:        "Valid Rate",
      value:        formatPercent(res.validRate ?? 0),
      change:       0,
      changePeriod: "",
      iconName:     "ShieldCheck",
      iconColor:    "text-emerald-600",
      iconBgColor:  "bg-emerald-50",
    },
    {
      id:           "invalid-rate",
      label:        "Invalid Rate",
      value:        formatPercent(res.invalidRate ?? 0),
      change:       0,
      changePeriod: "",
      iconName:     "AlertTriangle",
      iconColor:    "text-red-500",
      iconBgColor:  "bg-red-50",
    },
  ];
}

// ── Public ─────────────────────────────────────────────────────────────────

// Visible donut buckets — Unknown / Disposable are still filtered out so the
// chart matches the rest of the product copy (only Valid / Invalid / Risky).
const VISIBLE_BUCKETS = new Set(["Valid", "Invalid", "Risky"]);

/** Map /dashboard/chart response → existing ChartDataPoint[] used by the donut. */
function mapChart(res: DashboardChartResponse): ChartDataPoint[] {
  return res.data
    .filter((p) => VISIBLE_BUCKETS.has(p.name))
    .map((p) => ({
      name:       p.name,
      value:      p.value,
      // Existing UI expects "23%" strings; backend sends a number.
      percentage: `${Math.round(p.percentage)}%`,
      color:      p.color,
    }));
}

/**
 * Map the backend's BulkActiveJobDto → the dashboard's ActiveVerification
 * shape. Returns null when no job is currently processing.
 */
function mapActiveJob(job: BulkActiveJobDto | null): ActiveVerification | null {
  if (!job) return null;
  return {
    fileName:       job.fileName,
    progress:       job.progress,
    processedCount: job.processedCount,
    totalCount:     job.totalCount,
    etaSeconds:     job.etaSeconds,
    startedAt:      job.startedAt
      ? new Date(job.startedAt).toLocaleString()
      : "—",
    valid:          job.valid,
    invalid:        job.invalid,
    risky:          job.risky,
    disposable:     job.disposable,
  };
}

export async function fetchDashboardData(signal?: AbortSignal): Promise<DashboardData> {
  // Let failures surface to the view's error banner instead of silently
  // falling back to mock data — that hid backend/auth issues.
  let stats:              StatItem[];
  let chartData:          ChartDataPoint[];
  let chartTotal:         number;
  let activeVerification: ActiveVerification | null = null;

  try {
    // Stats + chart + active-job fetched in parallel — none depend on the other.
    // Active-job is wrapped so a 404/500 there doesn't take down the whole view.
    const [statsRes, chartRes, activeRes] = await Promise.all([
      apiDashboardService.getDashboardStats(signal),
      apiDashboardService.getDashboardChart("7d", signal),
      apiDashboardService.getActiveJob(signal).catch(() => null),
    ]);
    stats              = mapStats(statsRes);
    chartData          = mapChart(chartRes);
    // Centre total reflects only the visible buckets so the slices add up to it.
    chartTotal         = chartData.reduce((sum, p) => sum + p.value, 0);
    activeVerification = mapActiveJob(activeRes);
  } catch (err) {
    const apiErr = err as ApiError;
    throw new Error(apiErr?.message ?? "Failed to load dashboard data.");
  }

  return {
    stats,
    chartData,
    chartTotal,
    activeVerification,
    // RecentVerificationsTable self-fetches via /dashboard/recent-verifications,
    // so the mock here is unused by the live UI.
    recentVerifications: MOCK_RECENT_VERIFICATIONS,
  };
}
