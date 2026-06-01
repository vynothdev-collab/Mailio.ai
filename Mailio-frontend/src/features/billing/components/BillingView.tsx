import { PageHeader } from "@/src/components/layout/PageHeader";
import { CurrentPlanCard } from "./CurrentPlanCard";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { BillingHistoryTable } from "./BillingHistoryTable";

export function BillingView() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing"
        subtitle="Manage your plan, payment method, and billing history."
      />
      <div className="px-4 lg:px-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CurrentPlanCard />
          </div>
          <div className="lg:col-span-1">
            <PaymentMethodCard />
          </div>
        </div>

        <BillingHistoryTable />
      </div>
    </div>
  );
}
