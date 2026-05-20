import type { Metadata } from "next";
import { BillingView } from "@/src/features/billing/components/BillingView";

export const metadata: Metadata = {
  title: "Billing · Mailio.ai",
  description: "Manage your plan, payment method, and billing history.",
};

export default function BillingPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Billing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan, payment method, and billing history.
        </p>
      </div>

      <BillingView />
    </>
  );
}
