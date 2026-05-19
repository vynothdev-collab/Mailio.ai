"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import { verificationService, type SingleStatsDto } from "@/src/services/verificationService";
import type { ApiError } from "@/src/types/auth";

function EnvelopeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M8.70833 2.29175H2.29167C1.78541 2.29175 1.375 2.70215 1.375 3.20841V7.79175C1.375 8.29801 1.78541 8.70842 2.29167 8.70842H8.70833C9.21459 8.70842 9.625 8.29801 9.625 7.79175V3.20841C9.625 2.70215 9.21459 2.29175 8.70833 2.29175Z" stroke="#0F5BFF" strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.375 3.20825L5.5 5.95825L9.625 3.20825" stroke="#0F5BFF" strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M1.375 7.79159L4.125 5.04159L5.95833 6.87492L9.625 3.20825" stroke="#14A055" strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.41675 3.20825H9.62508V6.41659" stroke="#14A055" strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RefreshDotIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M9.625 4.58333V2.29166H7.33333" stroke="#0F5BFF" strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.625 4.58332C9.04687 3.29062 7.75 2.29166 6.18333 2.29166C4.05833 2.29166 2.33333 4.01666 2.33333 6.14166C2.33333 8.26666 4.05833 9.99166 6.18333 9.99166C7.91667 9.99166 9.36667 8.83332 9.85 7.33332" stroke="#0F5BFF" strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WarningTriangleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M5.5 4.125V5.95833" stroke="#E89B1A" strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5 7.79175H5.50458" stroke="#E89B1A" strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.72093 1.76923L0.834268 8.25007C0.754228 8.38868 0.711878 8.54583 0.711429 8.70589C0.710981 8.86595 0.752451 9.02333 0.831713 9.16239C0.910975 9.30145 1.02527 9.41733 1.16322 9.4985C1.30117 9.57967 1.45797 9.62331 1.61802 9.62507H9.38218C9.54223 9.62331 9.69903 9.57967 9.83698 9.4985C9.97493 9.41733 10.0892 9.30145 10.1685 9.16239C10.2478 9.02333 10.2892 8.86595 10.2888 8.70589C10.2883 8.54583 10.246 8.38868 10.1659 8.25007L6.27927 1.76923C6.19706 1.63658 6.08234 1.52711 5.94599 1.4512C5.80964 1.37529 5.65616 1.33545 5.5001 1.33545C5.34404 1.33545 5.19056 1.37529 5.05421 1.4512C4.91786 1.52711 4.80314 1.63658 4.72093 1.76923Z" stroke="#E89B1A" strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

interface Tile {
  id:        string;
  label:     string;
  value:     string;
  icon:      React.ReactNode;
  iconBg:    string;
}

function buildTiles(s: SingleStatsDto): Tile[] {
  const invalidRate = s.invalidRate ?? Math.max(0, 100 - s.successRate);
  const riskRate = s.riskRate ?? 0;
  return [
    {
      id:     "today-count",
      label:  "Today's Single Verifications",
      value:  s.todayCount.toLocaleString(),
      icon:   <EnvelopeIcon />,
      iconBg: "bg-[#E6EEFB]",
    },
    {
      id:     "success-rate",
      label:  "Success Rate",
      value:  `${s.successRate.toFixed(1)}%`,
      icon:   <TrendingUpIcon />,
      iconBg: "bg-[#E2F4EA]",
    },
    {
      id:     "invalid-rate",
      label:  "Invalid Rate",
      value:  `${invalidRate.toFixed(1)}%`,
      icon:   <RefreshDotIcon />,
      iconBg: "bg-[#E6EEFB]",
    },
    {
      id:     "risk-rate",
      label:  "Risk Rate",
      value:  `${riskRate.toFixed(1)}%`,
      icon:   <WarningTriangleIcon />,
      iconBg: "bg-[#FDEFD3]",
    },
  ];
}

function StatTile({ tile }: { tile: Tile }) {
  return (
    <div className="rounded-2xl bg-[#F4F8FF] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground leading-tight">{tile.label}</p>
        <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", tile.iconBg)}>
          {tile.icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums leading-none text-[#111827]">{tile.value}</p>
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
        <h2 className="text-base font-bold text-[#111827]">Verification Summary</h2>
        {loading && !stats ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            {buildTiles(stats).map((tile) => <StatTile key={tile.id} tile={tile} />)}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
