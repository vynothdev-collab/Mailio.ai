// Usage service — wraps /usage/* endpoints.

import { api } from "./api";
import type {
  UsageBreakdownDto,
  UsageChartPoint,
  UsageLogResponse,
  UsagePeriod,
  UsageQuotaDto,
  UsageType,
} from "@/src/types/usage";

export const usageService = {
  async getQuota(signal?: AbortSignal): Promise<UsageQuotaDto> {
    const { data } = await api.get<UsageQuotaDto>("/usage/quota", { signal });
    return data;
  },

  async getBreakdown(
    period: UsagePeriod = "30d",
    signal?: AbortSignal,
  ): Promise<UsageBreakdownDto> {
    const { data } = await api.get<UsageBreakdownDto>("/usage/breakdown", {
      params: { period },
      signal,
    });
    return data;
  },

  async getChart(
    period: UsagePeriod = "30d",
    signal?: AbortSignal,
  ): Promise<UsageChartPoint[]> {
    const { data } = await api.get<UsageChartPoint[]>("/usage/chart", {
      params: { period },
      signal,
    });
    return data;
  },

  async getLog(
    page = 1,
    limit = 10,
    type: UsageType = "all",
    signal?: AbortSignal,
  ): Promise<UsageLogResponse> {
    const { data } = await api.get<UsageLogResponse>("/usage/log", {
      params: { page, limit, type },
      signal,
    });
    return data;
  },
};
