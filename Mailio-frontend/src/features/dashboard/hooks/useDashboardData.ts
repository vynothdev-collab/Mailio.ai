"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { DashboardData } from "../types";
import { fetchDashboardData } from "../services/dashboardService";

interface UseDashboardDataResult {
  data:    DashboardData | null;
  loading: boolean;
  error:   string | null;
  refresh: () => void;
}

export function useDashboardData(): UseDashboardDataResult {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  // Prevents subsequent refreshes from flipping loading=true, which would
  // remount the dashboard children and wipe their local state (e.g. the
  // "last upload" panel inside BulkVerifyCard).
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData(signal);
      if (signal?.aborted) return;
      setData(result);
      hasLoadedOnce.current = true;
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { data, loading, error, refresh: load };
}
