import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoon } from "@/src/components/shared/ComingSoon";
import { ResultsPageClient } from "./ResultsPageClient";

export const metadata: Metadata = {
  title: "Results · emailanswers.ai",
  description: "View all single and bulk email verification results.",
};

export default function ResultsPage() {
  return (
    <Suspense fallback={<ComingSoon description="Loading results…" />}>
      <ResultsPageClient />
    </Suspense>
  );
}
