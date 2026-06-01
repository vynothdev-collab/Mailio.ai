import type { Metadata } from "next";
import { ComingSoon } from "@/src/components/shared/ComingSoon";

export const metadata: Metadata = {
  title: "Billing · emailanswers.ai",
  description: "Manage your plan, payment method, and billing history.",
};

export default function BillingPage() {
  return <ComingSoon description="We're building something amazing." />;
}
