import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ResultsPageClient } from "./ResultsPageClient";

export const metadata: Metadata = {
  title: "Results · emailanswers.ai",
  description: "View all single and bulk email verification results.",
};

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ResultsPageClient />
    </Suspense>
  );
}
