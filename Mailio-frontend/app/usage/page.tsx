import type { Metadata } from "next";
import { UsageView } from "@/src/features/usage/components/UsageView";

export const metadata: Metadata = {
  title: "Usage · Mailio.ai",
  description: "Monitor your email verification usage, quota, and credit consumption.",
};

export default function UsagePage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Usage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your quota, daily usage trends, and credit consumption.
        </p>
      </div>

      <UsageView />
    </>
  );
}
