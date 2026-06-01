"use client";

import { useState, useEffect } from "react";
import { Check, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/src/hooks/useAuth";
import { billingService, type BillingPlan } from "@/src/services/billingService";
import { UpgradePlanModal } from "./UpgradePlanModal";

export function CurrentPlanCard() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  useEffect(() => {
    billingService.getPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const creditBalance = Number(user?.effectiveCreditBalance ?? user?.creditBalance ?? 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-40">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-3 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Zap size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Credit Balance</p>
            <p className="text-xs text-muted-foreground">Available verifications</p>
          </div>
        </div>

        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold tabular-nums">{creditBalance.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground mb-1">credits remaining</span>
        </div>

        {plans.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Available plans:</p>
            <ul className="space-y-1">
              {plans.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check size={11} className="shrink-0 text-emerald-500" />
                  {p.name} — {p.credits.toLocaleString()} credits ({p.currency}{p.price})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1 gradient-brand border-0 text-white hover:opacity-90 text-sm"
            onClick={() => setModalOpen(true)}
            disabled={plans.length === 0}
          >
            {plans.length === 0 ? "No Plans Available" : "Get Credits"}
          </Button>
        </div>
      </CardContent>

      <UpgradePlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        plans={plans}
        activePlanId={activePlanId}
        onActivated={(planId) => setActivePlanId(planId)}
      />
    </Card>
  );
}
