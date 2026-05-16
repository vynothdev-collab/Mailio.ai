import type { Metadata } from "next";
import { ResultsView } from "@/src/features/results/components/ResultsView";

export const metadata: Metadata = {
  title: "Results · Mailio.ai",
  description: "View all single and bulk email verification results.",
};

export default function ResultsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Verification Results
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All single and bulk verification results in one place.
        </p>
      </div>

      <ResultsView />
    </>
  );
}
