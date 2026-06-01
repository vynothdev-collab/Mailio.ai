"use client";

import { useSearchParams } from "next/navigation";
import { BulkVerifyView } from "@/src/features/bulk-verify/components/BulkVerifyView";
import { JobResultsDetailView } from "@/src/features/results/components/JobResultsDetailView";

export function BulkVerifyPageClient() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  if (jobId) return <JobResultsDetailView jobId={jobId} />;
  return <BulkVerifyView />;
}
