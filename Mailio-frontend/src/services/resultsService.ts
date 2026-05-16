// Results service — wraps GET /results.
//
// Returns paginated rows + aggregate stats in a single call so the Results
// page doesn't have to hit two endpoints (or compute stats client-side).

import { api } from "./api";
import type { BulkJobDto } from "@/src/types/bulk";

export type ResultsRowStatus = "valid" | "invalid" | "risky";
export type ResultsRiskLevel = "low" | "medium" | "high" | null;
export type ResultsTypeFilter   = "all" | "single" | "bulk";
export type ResultsStatusFilter = "all" | ResultsRowStatus;

export interface ResultsRow {
  id:         string;
  type:       "single" | "bulk";
  label:      string;
  status:     ResultsRowStatus;
  risk:       ResultsRiskLevel;
  verifiedAt: string;
  bulkJob?:   BulkJobDto;
}

export interface ResultsStats {
  total:   number;
  valid:   number;
  invalid: number;
  risky:   number;
}

export interface ResultsResponse {
  data:  ResultsRow[];
  total: number;
  page:  number;
  limit: number;
  stats: ResultsStats;
}

export interface ResultsParams {
  page?:   number;
  limit?:  number;
  type?:   ResultsTypeFilter;
  status?: ResultsStatusFilter;
  query?:  string;
}

export const resultsService = {
  async getResults(
    params: ResultsParams = {},
    signal?: AbortSignal,
  ): Promise<ResultsResponse> {
    const { data } = await api.get<ResultsResponse>("/results", {
      params: {
        page:   params.page   ?? 1,
        limit:  params.limit  ?? 10,
        type:   params.type   ?? "all",
        status: params.status ?? "all",
        // Skip empty query so the backend's no-op branch kicks in cleanly.
        ...(params.query ? { query: params.query } : {}),
      },
      signal,
    });
    return data;
  },
};
