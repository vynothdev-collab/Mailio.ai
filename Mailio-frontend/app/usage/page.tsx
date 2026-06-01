import type { Metadata } from "next";
import { UsageView } from "@/src/features/usage/components/UsageView";

export const metadata: Metadata = {
  title: "Usage · emailanswers.ai",
  description: "Monitor your email verification usage, quota, and credit consumption.",
};

export default function UsagePage() {
  return <UsageView />;
}
