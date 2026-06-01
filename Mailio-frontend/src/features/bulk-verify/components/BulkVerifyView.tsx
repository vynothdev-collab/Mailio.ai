"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import { useJobProgress } from "@/src/hooks/useJobProgress";
import type {
  BulkActiveJobDto,
  BulkJobDto,
  BulkStatsDto,
} from "@/src/types/bulk";
import type { ApiError } from "@/src/types/auth";
import { UploadCard } from "./UploadCard";
import { BulkStatsRow } from "./BulkStatsRow";
import { RecentBulkFilesCard } from "./RecentBulkFilesCard";
import { RecentBulkVerificationsTable } from "./RecentBulkVerificationsTable";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { BulkVerifyContentSkeleton } from "@/src/components/shared/Skeleton";

const JOBS_PAGE_SIZE = 10;

export function BulkVerifyView() {
  const [stats,      setStats]      = useState<BulkStatsDto | null>(null);
  const [active,     setActive]     = useState<BulkActiveJobDto | null>(null);
  const [jobs,       setJobs]       = useState<BulkJobDto[]>([]);
  const [jobsTotal,  setJobsTotal]  = useState(0);
  const [jobsPage,   setJobsPage]   = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(false);

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

  useEffect(() => {
    if (!pendingUpload) return;
    const hasInFlight =
      !!active?.jobId ||
      jobs.some((j) => j.status === "processing" || j.status === "pending");
    const timer = window.setTimeout(
      () => setPendingUpload(false),
      hasInFlight ? 0 : 4000,
    );
    return () => window.clearTimeout(timer);
  }, [pendingUpload, active, jobs]);

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bulk Email Verification"
        subtitle="Upload a list and verify thousands of emails at once."
        onRefresh={() => void refreshFromUser()}
        refreshing={refreshing || loading}
      />

      {refreshing ? (
        <BulkVerifyContentSkeleton />
      ) : (
        <>
          <BulkStatsRow stats={stats} loading={loading} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              <UploadCard
                onUploaded={refetchAfterChange}
                onUploadingChange={setPendingUpload}
              />
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
              <RecentBulkFilesCard
                jobs={jobs}
                loading={loading}
                pendingUpload={pendingUpload}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
