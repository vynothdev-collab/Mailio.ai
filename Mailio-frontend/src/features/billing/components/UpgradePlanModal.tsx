"use client";

import { useState } from "react";
import { Check, Zap, Star, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";
import { billingService, type BillingPlan } from "@/src/services/billingService";

interface Props {
  open:         boolean;
  onClose:      () => void;
  plans:        BillingPlan[];
  activePlanId: string | null;
  onActivated:  (planId: string) => void;
}

type Step = "select" | "confirm";

export function UpgradePlanModal({ open, onClose, plans, activePlanId, onActivated }: Props) {
  const [step, setStep]       = useState<Step>("select");
  const [selected, setSelected] = useState<BillingPlan | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleSelect(plan: BillingPlan) {
    setSelected(plan);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!selected) return;
    setConfirming(true);
    try {
      await billingService.activatePlan(selected.id);
      onActivated(selected.id);
      onClose();
      setTimeout(() => { setStep("select"); setSelected(null); }, 300);
      toast.success(`${selected.name} activated!`, {
        description: `${selected.credits.toLocaleString()} credits have been added to your account.`,
      });
    } catch {
      toast.error("Failed to activate plan. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  function handleBack() {
    setStep("select");
    setSelected(null);
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      onClose();
      setTimeout(() => { setStep("select"); setSelected(null); }, 300);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("w-full", step === "select" ? "max-w-2xl!" : "max-w-md!")}
        showCloseButton
      >
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>Choose a Plan</DialogTitle>
              <DialogDescription>
                Select a plan to add credits to your account.
              </DialogDescription>
            </DialogHeader>

            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No plans available at this time.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {plans.map((plan, idx) => {
                  const isCurrent = plan.id === activePlanId;
                  const isHighlighted = idx === Math.floor(plans.length / 2);

                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "relative flex flex-col rounded-xl border p-4",
                        isHighlighted ? "border-primary/50 bg-primary/3 shadow-sm" : "border-border bg-card",
                        isCurrent && "ring-2 ring-primary/20"
                      )}
                    >
                      {isHighlighted && (
                        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full gradient-brand px-2.5 py-0.5 text-[10px] font-semibold text-white">
                          <Star size={8} fill="white" />
                          Popular
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 mb-1">
                        <Zap size={13} className={isHighlighted ? "text-primary" : "text-muted-foreground"} />
                        <span className="text-sm font-semibold">{plan.name}</span>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-end gap-0.5">
                          <span className="text-2xl font-bold tabular-nums">{plan.currency}{plan.price.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.credits.toLocaleString()} credits · {plan.validityDays}d validity</p>
                      </div>

                      <ul className="space-y-1.5 flex-1 mb-4">
                        {(plan.features ?? []).map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Check size={11} className="shrink-0 text-emerald-500 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      <Button
                        size="sm"
                        variant={isHighlighted ? "default" : "outline"}
                        className={cn(
                          "w-full text-xs",
                          isHighlighted && "gradient-brand border-0 text-white hover:opacity-90"
                        )}
                        onClick={() => handleSelect(plan)}
                      >
                        Select {plan.name}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
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
                    <p className="text-sm font-semibold">{selected?.name}</p>
                    <p className="text-xs text-muted-foreground">{selected?.credits.toLocaleString()} credits</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">{selected?.currency}{selected?.price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{selected?.validityDays}d validity</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <span className="text-sm font-semibold">Credits you will receive</span>
              <span className="text-lg font-bold tabular-nums">{selected?.credits.toLocaleString()}</span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={13} />
                Back
              </button>
              <Button
                className="flex-1 gradient-brand border-0 text-white hover:opacity-90 text-sm"
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? <Loader2 size={15} className="animate-spin" /> : "Confirm & Activate"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
