"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  resultsService,
  type ResultsResponse,
  type ResultsRow,
} from "@/src/services/resultsService";
import type { ApiError } from "@/src/types/auth";
import type { ResultRecord, ResultsFilters } from "../types";
import { ResultsStatsRow } from "./ResultsStatsRow";
import { ResultsFiltersBar } from "./ResultsFiltersBar";
import { ResultsTable } from "./ResultsTable";

const DEFAULT_FILTERS: ResultsFilters = {
  query:    "",
  status:   "all",
  type:     "all",
  page:     1,
  pageSize: 10,
};

const EMPTY_STATS = { total: 0, valid: 0, invalid: 0, risky: 0 };

function toRecord(row: ResultsRow): ResultRecord {
  return {
    id:         row.id,
    type:       row.type,
    label:      row.label,
    status:     row.status,
    risk:       row.risk,
    verifiedAt: row.verifiedAt,
    bulkJob:    row.bulkJob,
  };
}

export function ResultsView() {
  const [filters,  setFilters]  = useState<ResultsFilters>(DEFAULT_FILTERS);
  const [response, setResponse] = useState<ResultsResponse | null>(null);
  const [loading,  setLoading]  = useState(true);

  const patch = (p: Partial<ResultsFilters>) =>
    setFilters((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    resultsService
      .getResults(
        {
          page:   filters.page,
          limit:  filters.pageSize,
          type:   filters.type,
          status: filters.status,
          query:  filters.query,
        },
        controller.signal,
      )
      .then((res) => { if (!controller.signal.aborted) setResponse(res); })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const apiErr = err as ApiError;
        toast.error(apiErr?.message ?? "Failed to load results.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters.page, filters.pageSize, filters.type, filters.status, filters.query]);

  const records = response?.data.map(toRecord) ?? [];
  const total   = response?.total ?? 0;
  const stats   = response?.stats ?? EMPTY_STATS;

  return (
    <div className="space-y-4">
      <ResultsStatsRow stats={stats} loading={loading && !response} />

      <Card>
        <CardContent className="pt-3 space-y-3">
          <ResultsFiltersBar filters={filters} onChange={patch} />
          <ResultsTable
            records={records}
            filters={filters}
            total={total}
            loading={loading}
            onChange={patch}
          />
        </CardContent>
      </Card>
    </div>
  );
}
