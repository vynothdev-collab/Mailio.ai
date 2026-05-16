// Dashboard service — wraps /dashboard/* endpoints.
// Bearer token attached automatically by the request interceptor;
// 401s flow through the global refresh-or-logout handling.

import { api } from "./api";
import type {
  DashboardChartPeriod,
  DashboardChartResponse,
  DashboardStatsResponse,
  RecentVerificationsResponse,
} from "@/src/types/dashboard";
import type { BulkActiveJobDto } from "@/src/types/bulk";

export interface AccountUsageDto {
  used:        number;
  total?:      number;
  limit?:      number;
  plan:        "PRO" | "ULTIMATE" | string;
  percentage?: number;
  periodStart?: string;
  periodEnd?:   string;
}

export const dashboardService = {
  /** Fetch summary stats for the dashboard hero row. */
  async getDashboardStats(signal?: AbortSignal): Promise<DashboardStatsResponse> {
    const { data } = await api.get<DashboardStatsResponse>("/dashboard/stats", { signal });
    return data;
  },

  /** Fetch donut-chart breakdown (Valid/Invalid/Risky/Unknown counts). */
  async getDashboardChart(
    period: DashboardChartPeriod = "7d",
    signal?: AbortSignal,
  ): Promise<DashboardChartResponse> {
    const { data } = await api.get<DashboardChartResponse>("/dashboard/chart", {
      params: { period },
      signal,
    });
    return data;
  },

  /** GET /account/usage — current-period usage and plan limit. */
  async getAccountUsage(signal?: AbortSignal): Promise<AccountUsageDto> {
    const { data } = await api.get<AccountUsageDto>("/account/usage", { signal });
    return data;
  },

  /** Currently-processing bulk job for the dashboard's "Active Verification" card. */
  async getActiveJob(signal?: AbortSignal): Promise<BulkActiveJobDto | null> {
    const { data } = await api.get<BulkActiveJobDto | null>("/dashboard/active-job", { signal });
    return data;
  },

  /** Paginated recent verification activity (single + bulk mixed). */
  async getRecentVerifications(
    page = 1,
    limit = 10,
    signal?: AbortSignal,
  ): Promise<RecentVerificationsResponse> {
    const { data } = await api.get<RecentVerificationsResponse>(
      "/dashboard/recent-verifications",
      { params: { page, limit }, signal },
    );
    return data;
  },
};
