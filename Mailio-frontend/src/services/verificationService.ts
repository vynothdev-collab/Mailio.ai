import { api } from "./api";
import { downloadFile } from "@/src/lib/download";
import type { VerificationResponse } from "@/src/types/verification";

export interface SingleRecentItem {
  id:         string;
  email:      string;
  status:     "valid" | "invalid" | "risky" | "unknown";
  risk:       "low" | "medium" | "high" | "unknown";
  verifiedAt: string;
}

interface SingleRecentResponse {
  data:  SingleRecentItem[];
  total: number;
  page:  number;
  limit: number;
}

export interface SingleStatsDto {
  todayCount:    number;
  successRate:   number;
  apiUsage:      number;
  avgResponseMs: number;
  invalidRate?:  number;
  riskRate?:     number;
  changes: {
    todayCount:    string;
    successRate:   string;
    avgResponseMs: string;
  };
}

export const verificationService = {
  async verifySingleEmail(email: string): Promise<VerificationResponse> {
    const { data } = await api.post<VerificationResponse>("/verify/single", { email });
    return data;
  },

  async getRecent(
    page = 1,
    limit = 50,
    signal?: AbortSignal,
  ): Promise<SingleRecentResponse> {
    const { data } = await api.get<SingleRecentResponse>("/verify/single/recent", {
      params: { page, limit },
      signal,
    });
    return data;
  },

  async getStats(signal?: AbortSignal): Promise<SingleStatsDto> {
    const { data } = await api.get<SingleStatsDto>("/verify/single/stats", { signal });
    return data;
  },

  async download(id: string): Promise<void> {
    await downloadFile(`/verify/single/${id}/download`, `verification-${id}.csv`);
  },
};
