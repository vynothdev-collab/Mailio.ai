"use client";

import { useEffect, useState } from "react";
import { Mail, BarChart3, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import { verificationService, type SingleStatsDto } from "@/src/services/verificationService";
import type { ApiError } from "@/src/types/auth";

interface Tile {
  id:           string;
  label:        string;
  value:        string;
  Icon:         React.ElementType;
  iconColor:    string;
  iconBgColor:  string;
}

function buildTiles(s: SingleStatsDto): Tile[] {
  return [
    {
      id:          "today-count",
      label:       "Today's Single Verifications",
      value:       s.todayCount.toLocaleString(),
      Icon:        Mail,
      iconColor:   "text-blue-600",
      iconBgColor: "bg-blue-50",
    },
    {
      id:          "success-rate",
      label:       "Success Rate",
      value:       `${s.successRate.toFixed(1)}%`,
      Icon:        BarChart3,
      iconColor:   "text-emerald-600",
      iconBgColor: "bg-emerald-50",
    },
    {
      id:          "avg-response",
      label:       "Avg. Response Time",
      value:       s.avgResponseMs > 0 ? `${(s.avgResponseMs / 1000).toFixed(1)}s` : "—",
      Icon:        Clock,
      iconColor:   "text-amber-600",
      iconBgColor: "bg-amber-50",
    },
  ];
}

function StatTile({ tile }: { tile: Tile }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground leading-tight">{tile.label}</p>
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tile.iconBgColor)}>
          <tile.Icon size={14} className={tile.iconColor} />
        </div>
      </div>
      <p className="text-xl font-bold tabular-nums leading-none">{tile.value}</p>
    </div>
  );
}

interface Props {
  refreshKey?: number;
}

export function VerificationSummaryCard({ refreshKey = 0 }: Props) {
  const [stats,   setStats]   = useState<SingleStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    verificationService
      .getStats(controller.signal)
      .then((res) => { if (!controller.signal.aborted) setStats(res); })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const apiErr = err as ApiError;
        setError(apiErr?.message ?? "Failed to load stats.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey]);

  return (
    <Card>
      <CardContent className="pt-2 space-y-3">
        <h2 className="text-sm font-semibold">Verification Summary</h2>
        {loading && !stats ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-2">
            {buildTiles(stats).map((tile) => <StatTile key={tile.id} tile={tile} />)}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
