"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { billingService, type BillingPlan } from "@/src/services/billingService";

interface Props {
  plan: BillingPlan | null;
  onClose: () => void;
  onActivated: (plan: BillingPlan) => void;
}

export function ConfirmPlanModal({ plan, onClose, onActivated }: Props) {
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    if (!plan) return;
    setConfirming(true);
    try {
      await billingService.activatePlan(plan.id);
      onActivated(plan);
      onClose();
    } catch {
      toast.error("Failed to activate plan. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md!" showCloseButton>
        <DialogHeader>
          <DialogTitle>Confirm Plan Activation</DialogTitle>
          <DialogDescription>
            Review your selection before activating.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Zap size={14} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{plan?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {plan?.credits.toLocaleString()} credits
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">
                {plan?.currency}{plan?.price.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {plan?.validityDays}d validity
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
          <span className="text-sm font-semibold">Credits you will receive</span>
          <span className="text-lg font-bold tabular-nums">
            {plan?.credits.toLocaleString()}
          </span>
        </div>

        <Button
          className="w-full gradient-brand border-0 text-white hover:opacity-90 text-sm"
          onClick={handleConfirm}
          disabled={confirming}
        >
          {confirming ? <Loader2 size={15} className="animate-spin" /> : "Confirm & Activate"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
