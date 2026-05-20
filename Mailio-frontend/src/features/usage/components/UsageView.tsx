"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usageService } from "@/src/services/usageService";
import type {
  UsageBreakdownDto,
  UsageChartPoint,
  UsagePeriod,
  UsageQuotaDto,
} from "@/src/types/usage";
import type { ApiError } from "@/src/types/auth";
import { PlanQuotaCard } from "./PlanQuotaCard";
import { UsageBreakdownTiles } from "./UsageBreakdownTiles";
import { UsageChart } from "./UsageChart";
import { UsageLogTable } from "./UsageLogTable";

const CHART_PERIOD: UsagePeriod = "30d";

export function UsageView() {
  const [quota,     setQuota]     = useState<UsageQuotaDto | null>(null);
  const [breakdown, setBreakdown] = useState<UsageBreakdownDto | null>(null);
  const [chart,     setChart]     = useState<UsageChartPoint[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const [q, b, c] = await Promise.all([
          usageService.getQuota(controller.signal),
          usageService.getBreakdown(CHART_PERIOD, controller.signal),
          usageService.getChart(CHART_PERIOD, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setQuota(q);
        setBreakdown(b);
        setChart(c);
      } catch (err) {
        if (controller.signal.aborted) return;
        toast.error((err as ApiError)?.message ?? "Failed to load usage data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <PlanQuotaCard quota={quota} loading={loading} />
        </div>
        <div className="lg:col-span-2 flex flex-col justify-center">
          <UsageBreakdownTiles breakdown={breakdown} loading={loading} />
        </div>
      </div>

      <UsageChart data={chart} loading={loading} />

      <UsageLogTable />
    </div>
  );
}
