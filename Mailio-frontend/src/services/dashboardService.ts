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
  async getDashboardStats(signal?: AbortSignal): Promise<DashboardStatsResponse> {
    const { data } = await api.get<DashboardStatsResponse>("/dashboard/stats", { signal });
    return data;
  },

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

  async getAccountUsage(signal?: AbortSignal): Promise<AccountUsageDto> {
    const { data } = await api.get<AccountUsageDto>("/account/usage", { signal });
    return data;
  },

  async getActiveJob(signal?: AbortSignal): Promise<BulkActiveJobDto | null> {
    const { data } = await api.get<BulkActiveJobDto | null>("/dashboard/active-job", { signal });
    return data;
  },

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
