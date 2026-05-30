import { api } from "./api";
import type { BulkJobDto } from "@/src/types/bulk";

type ResultsRowStatus = "valid" | "invalid" | "catchall";
type ResultsCatchallLevel = "low" | "medium" | "high" | null;
type ResultsTypeFilter   = "all" | "single" | "bulk";
type ResultsStatusFilter = "all" | ResultsRowStatus;

export interface ResultsRow {
  id:         string;
  type:       "single" | "bulk";
  label:      string;
  status:     ResultsRowStatus;
  catchall:   ResultsCatchallLevel;
  verifiedAt: string;
  bulkJob?:   BulkJobDto;
}

export interface ResultsStats {
  total:   number;
  valid:   number;
  invalid: number;
  catchall:   number;
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
