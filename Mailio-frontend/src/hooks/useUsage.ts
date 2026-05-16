"use client";

// Fetches /account/usage for the navbar's plan + quota pill.
// Polls lazily on mount only — verifies a refresh after each new verification
// would be nicer, but that means crossing several feature boundaries. For now
// callers can call refresh() manually when they know usage changed.

import { useCallback, useEffect, useState } from "react";
import {
  dashboardService,
  type AccountUsageDto,
} from "@/src/services/dashboardService";

export interface UsageState {
  data:    AccountUsageDto | null;
  loading: boolean;
  error:   string | null;
  refresh: () => Promise<void>;
}

export function useUsage(): UsageState {
  const [data,    setData]    = useState<AccountUsageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getAccountUsage();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Strict-mode-friendly: abort the in-flight request from the first effect
  // run so we don't hit the network twice in dev.
  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    dashboardService
      .getAccountUsage(controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load usage.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { data, loading, error, refresh };
}
