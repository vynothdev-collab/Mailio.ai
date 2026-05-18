"use client";

import { useDashboardData } from "../hooks/useDashboardData";
import { DashboardSkeleton } from "@/src/components/shared/Skeleton";
import { StatsGrid }                  from "./StatsGrid";
import { BulkVerifyCard }             from "./BulkVerifyCard";
import { SingleVerifyCard }           from "./SingleVerifyCard";
import { ResultsOverview }            from "./ResultsOverview";
import { RecentVerificationsTable }   from "./RecentVerificationsTable";
import { AlertCircle, RefreshCw }     from "lucide-react";

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} />
        {message}
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800 transition-colors"
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  );
}

export function DashboardView() {
  const { data, loading, error, refresh } = useDashboardData();

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return <ErrorBanner message={error ?? "Unknown error"} onRetry={refresh} />;
  }

  const { stats, chartData, chartTotal } = data;

  return (
    <div className="space-y-5">
      <StatsGrid stats={stats} loading={false} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BulkVerifyCard onUploaded={refresh} />
        <SingleVerifyCard onVerified={refresh} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ResultsOverview data={chartData} total={chartTotal} />
        <div className="lg:col-span-2">
          <RecentVerificationsTable />
        </div>
      </div>
    </div>
  );
}
