import type { Metadata } from "next";
import { BillingPageClient } from "@/src/features/billing/components/BillingPageClient";

export const metadata: Metadata = {
  title: "Billing · emailanswers.ai",
  description: "Manage your plan, payment method, and billing history.",
};

export default function BillingPage() {
  return <BillingPageClient />;
}
