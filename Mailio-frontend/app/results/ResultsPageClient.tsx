"use client";

import { useSearchParams } from "next/navigation";
import { JobResultsDetailView } from "@/src/features/results/components/JobResultsDetailView";
import { ResultsView } from "@/src/features/results/components/ResultsView";

export function ResultsPageClient() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  if (jobId) {
    return <JobResultsDetailView jobId={jobId} />;
  }
  return <ResultsView />;
}
