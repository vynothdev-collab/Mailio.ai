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

function formatInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function formatPercent(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

function parseChange(raw?: string): number {
  if (!raw) return 0;
  const n = Number(raw.replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

function mapStats(res: DashboardStatsResponse): StatItem[] {
  const c = res.changes ?? {};
  return [
    {
      id:           "total-verified",
      label:        "Total Verified",
      value:        formatInt(res.totalVerified ?? 0),
      change:       parseChange(c.totalVerified),
      changePeriod: "vs last 7 days",
      iconName:     "Mail",
      iconColor:    "text-blue-600",
      iconBgColor:  "bg-blue-50",
    },
    {
      id:           "valid-rate",
      label:        "Valid Rate",
      value:        formatPercent(res.validRate ?? 0),
      change:       parseChange(c.validRate),
      changePeriod: "deliverable inboxes",
      iconName:     "ShieldCheck",
      iconColor:    "text-emerald-600",
      iconBgColor:  "bg-emerald-50",
    },
    {
      id:           "invalid-rate",
      label:        "Invalid Rate",
      value:        formatPercent(res.invalidRate ?? 0),
      change:       parseChange(c.riskyEmails),
      changePeriod: "hard bounces blocked",
      iconName:     "AlertTriangle",
      iconColor:    "text-red-500",
      iconBgColor:  "bg-red-50",
    },
    {
      id:           "risk-rate",
      label:        "Risk Rate",
      value:        formatPercent(res.riskyRate ?? 0),
      change:       parseChange(c.riskyRate),
      changePeriod: "hard bounces blocked",
      iconName:     "AlertTriangle",
      iconColor:    "text-amber-600",
      iconBgColor:  "bg-amber-50",
    },
  ];
}

const VISIBLE_BUCKETS = new Set(["Valid", "Invalid", "Risky"]);

function mapChart(res: DashboardChartResponse): ChartDataPoint[] {
  return res.data
    .filter((p) => VISIBLE_BUCKETS.has(p.name))
    .map((p) => ({
      name:       p.name,
      value:      p.value,
      percentage: `${Math.round(p.percentage)}%`,
      color:      p.color,
    }));
}

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
  let stats:              StatItem[];
  let chartData:          ChartDataPoint[];
  let chartTotal:         number;
  let activeVerification: ActiveVerification | null = null;

  try {
    const [statsRes, chartRes, activeRes] = await Promise.all([
      apiDashboardService.getDashboardStats(signal),
      apiDashboardService.getDashboardChart("30d", signal),
      apiDashboardService.getActiveJob(signal).catch(() => null),
    ]);
    chartData          = mapChart(chartRes);
    chartTotal         = statsRes.totalVerified ?? chartData.reduce((sum, p) => sum + p.value, 0);
    stats              = mapStats(statsRes);
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
    recentVerifications: MOCK_RECENT_VERIFICATIONS,
  };
}
