import { CurrentPlanCard } from "./CurrentPlanCard";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { BillingHistoryTable } from "./BillingHistoryTable";

export function BillingView() {
  return (
    <div className="space-y-4">
      {/* Top row: plan + payment method */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CurrentPlanCard />
        </div>
        <div className="lg:col-span-1">
          <PaymentMethodCard />
        </div>
      </div>

      {/* Billing history */}
      <BillingHistoryTable />
    </div>
  );
}
