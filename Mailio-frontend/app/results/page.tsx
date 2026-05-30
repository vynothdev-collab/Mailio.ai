import type { Metadata } from "next";
import { ComingSoon } from "@/src/components/shared/ComingSoon";

export const metadata: Metadata = {
  title: "Results · emailanswers.ai",
  description: "View all single and bulk email verification results.",
};

export default function ResultsPage() {
  return <ComingSoon description="We're building something amazing." />;
}
