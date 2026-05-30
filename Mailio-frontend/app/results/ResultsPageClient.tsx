"use client";

import { useSearchParams } from "next/navigation";
import { ComingSoon } from "@/src/components/shared/ComingSoon";
import { JobResultsDetailView } from "@/src/features/results/components/JobResultsDetailView";

export function ResultsPageClient() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  if (jobId) {
    return <JobResultsDetailView jobId={jobId} />;
  }
  return <ComingSoon description="We're building something amazing." />;
}
