"use client";

import { useEffect, useState, useCallback } from "react";
import type { DashboardData } from "../types";
import { fetchDashboardData } from "../services/dashboardService";

interface UseDashboardDataResult {
  data:        DashboardData | null;
  loading:     boolean;
  refreshing:  boolean;
  error:       string | null;
  /** Explicit user refresh — shows skeleton. */
  refresh:     () => void;
  /** Internal refresh — silent, keeps UI mounted. */
  silentReload: () => void;
}

export function useDashboardData(): UseDashboardDataResult {
  const [data,       setData]       = useState<DashboardData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal, showSkeleton = false) => {
      if (showSkeleton) setRefreshing(true);
      setError(null);
      try {
        const result = await fetchDashboardData(signal);
        if (signal?.aborted) return;
        setData(result);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => {
    void load(undefined, true);
  }, [load]);

  const silentReload = useCallback(() => {
    void load(undefined, false);
  }, [load]);

  return { data, loading, refreshing, error, refresh, silentReload };
}
