import { api } from "./api";
import type { BulkJobDto } from "@/src/types/bulk";

type ResultsRowStatus = "valid" | "invalid" | "risky";
type ResultsRiskLevel = "low" | "medium" | "high" | null;
type ResultsTypeFilter   = "all" | "single" | "bulk";
type ResultsStatusFilter = "all" | ResultsRowStatus;

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

interface ResultsParams {
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
        ...(params.query ? { query: params.query } : {}),
      },
      signal,
    });
    return data;
  },
};
