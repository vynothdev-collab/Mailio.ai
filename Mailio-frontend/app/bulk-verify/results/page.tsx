import type { Metadata } from "next";
import { Suspense } from "react";
import { BulkVerifyResultsPageClient } from "./BulkVerifyResultsPageClient";

export const metadata: Metadata = {
  title: "Verification Results · emailanswers.ai",
  description: "View the results of your bulk email verification job.",
};

export default function BulkVerifyResultsPage() {
  return (
    <Suspense fallback={null}>
      <BulkVerifyResultsPageClient />
    </Suspense>
  );
}
