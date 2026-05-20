"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import { useJobProgress } from "@/src/hooks/useJobProgress";
import type {
  BulkActiveJobDto,
  BulkBreakdownDto,
  BulkJobDto,
  BulkStatsDto,
} from "@/src/types/bulk";
import type { ApiError } from "@/src/types/auth";
import { UploadCard } from "./UploadCard";
import { BulkStatsRow } from "./BulkStatsRow";
import { VerificationBreakdownCard } from "./VerificationBreakdownCard";
import { RecentBulkVerificationsTable } from "./RecentBulkVerificationsTable";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { BulkVerifySkeleton } from "@/src/components/shared/Skeleton";

const JOBS_PAGE_SIZE = 10;

export function BulkVerifyView() {
  const [stats,      setStats]      = useState<BulkStatsDto | null>(null);
  const [active,     setActive]     = useState<BulkActiveJobDto | null>(null);
  const [jobs,       setJobs]       = useState<BulkJobDto[]>([]);
  const [jobsTotal,  setJobsTotal]  = useState(0);
  const [jobsPage,   setJobsPage]   = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refetch = useCallback(
    async (page = jobsPage, signal?: AbortSignal, showSkeleton = false) => {
      if (showSkeleton) setRefreshing(true);
      try {
        const [statsRes, activeRes, jobsRes] = await Promise.all([
          bulkVerifyService.getStats(signal),
          bulkVerifyService.getActive(signal),
          bulkVerifyService.getJobs(page, JOBS_PAGE_SIZE, undefined, signal),
        ]);
        if (signal?.aborted) return;
        setStats(statsRes);
        setActive(activeRes);
        setJobs(jobsRes.data);
        setJobsTotal(jobsRes.total);
      } catch (err) {
        if (signal?.aborted) return;
        const apiErr = err as ApiError;
        toast.error(apiErr?.message ?? "Failed to load bulk verification data.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [jobsPage],
  );

  const refetchAfterChange = useCallback(() => {
    setJobsPage(1);
    return refetch(1);
  }, [refetch]);

  const refreshFromUser = useCallback(() => {
    setJobsPage(1);
    return refetch(1, undefined, true);
  }, [refetch]);

  useEffect(() => {
    const controller = new AbortController();
    void refetch(jobsPage, controller.signal);
    return () => controller.abort();
  }, [jobsPage]);

  useJobProgress(active?.jobId, refetchAfterChange);

  const latestJob = jobs[0];
  const latestIsInFlight =
    latestJob?.status === 'pending' || latestJob?.status === 'processing';
  const activeIsDone =
    !!active &&
    active.totalCount > 0 &&
    active.processedCount >= active.totalCount;

  const shouldPoll =
    !!active?.jobId && latestIsInFlight && !activeIsDone;

  useEffect(() => {
    if (!shouldPoll) return;
    const timer = window.setInterval(() => {
      void refetch(jobsPage);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [shouldPoll, refetch, jobsPage]);

  const breakdown = useMemo<BulkBreakdownDto | null>(() => {
    if (!stats) return null;
    const valid = stats.successCount ?? 0;
    const invalid = stats.invalidCount ?? 0;
    const risky = stats.riskCount ?? 0;
    const total = valid + invalid + risky;
    if (total === 0) return { data: [], total: 0 };
    return {
      total,
      data: [
        { name: "Valid",   value: valid,   percentage: (valid / total) * 100,   color: "#22c55e" },
        { name: "Invalid", value: invalid, percentage: (invalid / total) * 100, color: "#ef4444" },
        { name: "Risky",   value: risky,   percentage: (risky / total) * 100,   color: "#f59e0b" },
      ],
    };
  }, [stats]);

  if (refreshing) {
    return <BulkVerifySkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bulk Email Verification"
        subtitle="Upload a list and verify thousands of emails at once."
        onRefresh={() => void refreshFromUser()}
        refreshing={loading}
      />

      <BulkStatsRow stats={stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <UploadCard onUploaded={refetchAfterChange} />
          <RecentBulkVerificationsTable
            jobs={jobs}
            total={jobsTotal}
            page={jobsPage}
            pageSize={JOBS_PAGE_SIZE}
            loading={loading}
            onPageChange={setJobsPage}
            onChange={refetchAfterChange}
          />
        </div>

        <div className="space-y-4">
          <VerificationBreakdownCard breakdown={breakdown} loading={loading} />
        </div>
      </div>
    </div>
  );
}
