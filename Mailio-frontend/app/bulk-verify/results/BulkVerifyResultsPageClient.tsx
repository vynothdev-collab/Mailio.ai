"use client";

import { useSearchParams } from "next/navigation";
import { JobResultsDetailView } from "@/src/features/results/components/JobResultsDetailView";

export function BulkVerifyResultsPageClient() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    if (typeof window !== "undefined") window.location.href = "/bulk-verify";
    return null;
  }
  return <JobResultsDetailView jobId={jobId} />;
}
