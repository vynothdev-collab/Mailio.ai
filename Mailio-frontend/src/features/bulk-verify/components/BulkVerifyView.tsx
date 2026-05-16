"use client";

import { useCallback, useEffect, useState } from "react";
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

const JOBS_PAGE_SIZE = 10;

export function BulkVerifyView() {
  const [stats,      setStats]      = useState<BulkStatsDto | null>(null);
  // Active job is still tracked internally so we can subscribe to live
  // progress and trigger a refetch on completion — even though the card
  // itself was removed from the layout.
  const [active,     setActive]     = useState<BulkActiveJobDto | null>(null);
  const [jobs,       setJobs]       = useState<BulkJobDto[]>([]);
  const [jobsTotal,  setJobsTotal]  = useState(0);
  const [jobsPage,   setJobsPage]   = useState(1);
  const [breakdown,  setBreakdown]  = useState<BulkBreakdownDto | null>(null);
  const [loading,    setLoading]    = useState(true);

  const refetch = useCallback(async (page = jobsPage, signal?: AbortSignal) => {
    try {
      const [statsRes, activeRes, jobsRes, breakdownRes] = await Promise.all([
        bulkVerifyService.getStats(signal),
        bulkVerifyService.getActive(signal),
        bulkVerifyService.getJobs(page, JOBS_PAGE_SIZE, undefined, signal),
        bulkVerifyService.getAggregateBreakdown(signal),
      ]);
      if (signal?.aborted) return;
      setStats(statsRes);
      setActive(activeRes);
      setJobs(jobsRes.data);
      setJobsTotal(jobsRes.total);
      setBreakdown(breakdownRes);
    } catch (err) {
      if (signal?.aborted) return;
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Failed to load bulk verification data.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [jobsPage]);

  // After a new upload, jump back to page 1 so the fresh job is visible.
  const refetchAfterChange = useCallback(() => {
    setJobsPage(1);
    return refetch(1);
  }, [refetch]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch(jobsPage, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsPage]);

  // Subscribe to the live socket stream for the running job — we don't render
  // the active card anymore but we still want to refetch when the job ends so
  // the breakdown + jobs table update without a manual reload.
  useJobProgress(active?.jobId, refetchAfterChange);

  // Polling fallback for in-flight jobs. We only poll when the user
  // actually has work in progress — concretely:
  //
  //   1. The latest row in the Recent Verifications table is `pending`
  //      or `processing`. If the most recent upload is already
  //      `completed` / `failed`, the user isn't waiting on anything and
  //      there's nothing to refresh on a timer.
  //   2. AND the backend's /verify/bulk/active still returns a job
  //      (defensive — stops polling immediately when getActive returns
  //      null even if the table snapshot hasn't refreshed yet).
  //   3. AND the active job hasn't already hit 100 % processed (cuts
  //      the polling the instant the counters catch up, even before the
  //      backend flips the status).
  //
  // Any of those false → no polling, no network noise.
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
