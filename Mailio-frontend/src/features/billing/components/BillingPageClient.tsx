"use client";

import { useRole } from "@/src/hooks/useRole";
import { RoleGuard } from "@/src/components/auth/RoleGuard";
import { BillingView } from "./BillingView";
import { EnterpriseBillingView } from "./EnterpriseBillingView";

export function BillingPageClient() {
  const { isEnterpriseAdmin } = useRole();

  return (
    <RoleGuard allow={["USER", "SUPER_ADMIN", "ENTERPRISE_ADMIN"]}>
      {isEnterpriseAdmin ? <EnterpriseBillingView /> : <BillingView />}
    </RoleGuard>
  );
}
