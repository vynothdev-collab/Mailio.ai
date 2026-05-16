// Verification service — wraps /verify/single/* endpoints.
// Components stay free of axios + URL details and get a typed response.

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

export interface SingleRecentResponse {
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
  changes: {
    todayCount:    string;
    successRate:   string;
    avgResponseMs: string;
  };
}

export const verificationService = {
  /** POST /verify/single — synchronous single email verification. */
  async verifySingleEmail(email: string): Promise<VerificationResponse> {
    const { data } = await api.post<VerificationResponse>("/verify/single", { email });
    return data;
  },

  /** GET /verify/single/recent — paginated history. */
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

  /** GET /verify/single/stats */
  async getStats(signal?: AbortSignal): Promise<SingleStatsDto> {
    const { data } = await api.get<SingleStatsDto>("/verify/single/stats", { signal });
    return data;
  },

  /** Trigger an authenticated CSV download for a single verification. */
  async download(id: string): Promise<void> {
    await downloadFile(`/verify/single/${id}/download`, `verification-${id}.csv`);
  },
};
