"use client";

import { useCallback, useState } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { DashboardSkeleton } from "@/src/components/shared/Skeleton";
import { StatsGrid }                  from "./StatsGrid";
import { BulkVerifyCard }             from "./BulkVerifyCard";
import { SingleVerifyCard }           from "./SingleVerifyCard";
import { ResultsOverview }            from "./ResultsOverview";
import { RecentVerificationsTable }   from "./RecentVerificationsTable";
import { PageHeader }                 from "@/src/components/layout/PageHeader";
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
  const { data, loading, refreshing, error, refresh, silentReload } = useDashboardData();
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const handleVerified = useCallback(() => {
    silentReload();
    setTableRefreshKey((k) => k + 1);
  }, [silentReload]);

  if ((loading && !data) || (refreshing && !data)) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Email Verification Dashboard"
          subtitle="Clean your lists, reduce bounce rates, and improve deliverability before every outreach."
          onRefresh={refresh}
          refreshing={refreshing}
        />
        <ErrorBanner message={error ?? "Unknown error"} onRetry={refresh} />
      </div>
    );
  }

  const { stats, chartData, chartTotal } = data;

  if (refreshing) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Email Verification Dashboard"
        subtitle="Clean your lists, reduce bounce rates, and improve deliverability before every outreach."
        onRefresh={refresh}
        refreshing={refreshing}
      />

      <StatsGrid stats={stats} loading={false} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        <BulkVerifyCard onUploaded={handleVerified} />
        <SingleVerifyCard onVerified={handleVerified} />
        <div className="md:col-span-2 lg:col-span-1">
          <ResultsOverview data={chartData} total={chartTotal} />
        </div>
      </div>

      <RecentVerificationsTable onDeleted={silentReload} refreshKey={tableRefreshKey} />
    </div>
  );
}
