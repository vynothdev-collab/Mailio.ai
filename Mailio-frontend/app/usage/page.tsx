import type { Metadata } from "next";
import { ComingSoon } from "@/src/components/shared/ComingSoon";

export const metadata: Metadata = {
  title: "Usage · Mailio.ai",
  description: "Monitor your email verification usage, quota, and credit consumption.",
};

export default function UsagePage() {
  return <ComingSoon description="We're building something amazing." />;
}
