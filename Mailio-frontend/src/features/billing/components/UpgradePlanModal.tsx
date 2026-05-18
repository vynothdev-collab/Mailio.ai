"use client";

import { useState } from "react";
import { Check, Zap, Star, CreditCard, ArrowLeft, CalendarClock } from "lucide-react";
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
import { PLANS, type Plan } from "../mock/plans";
import { MOCK_PAYMENT_METHOD } from "../mock";
import type { BillingCycle } from "../types";

interface Props {
  open:          boolean;
  onClose:       () => void;
  currentPlanId: string;
}

type Step = "select" | "confirm";

function StepSelect({
  currentPlanId,
  cycle,
  onCycleChange,
  onSelect,
}: {
  currentPlanId: string;
  cycle:         BillingCycle;
  onCycleChange: (c: BillingCycle) => void;
  onSelect:      (plan: Plan) => void;
}) {
  const savings = Math.round(
    ((PLANS[1].monthlyPrice! - PLANS[1].annualPrice!) / PLANS[1].monthlyPrice!) * 100
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Choose a Plan</DialogTitle>
        <DialogDescription>
          Upgrade or change your plan at any time. Changes take effect immediately.
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {(["monthly", "annual"] as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => onCycleChange(c)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize",
                cycle === c
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
              {c === "annual" && (
                <span className="ml-1 text-[10px] text-emerald-600 font-semibold">
                  -{savings}%
                </span>
              )}
            </button>
          ))}
        </div>
        {cycle === "annual" && (
          <span className="text-xs text-emerald-600 font-medium">
            Save up to {savings}% with annual billing
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLANS.map((plan) => {
          const isCurrent    = plan.id === currentPlanId;
          const price        = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
          const isEnterprise = plan.monthlyPrice === null;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl border p-4",
                plan.highlighted ? "border-primary/50 bg-primary/3 shadow-sm" : "border-border bg-card",
                isCurrent && "ring-2 ring-primary/20"
              )}
            >
              {plan.highlighted && (
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full gradient-brand px-2.5 py-0.5 text-[10px] font-semibold text-white">
                  <Star size={8} fill="white" />
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={13} className={plan.highlighted ? "text-primary" : "text-muted-foreground"} />
                <span className="text-sm font-semibold">{plan.name}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug mb-3">{plan.description}</p>

              <div className="mb-4">
                {isEnterprise ? (
                  <p className="text-xl font-bold">Custom</p>
                ) : (
                  <div className="flex items-end gap-0.5">
                    <span className="text-2xl font-bold tabular-nums">${price}</span>
                    <span className="text-xs text-muted-foreground mb-1">/mo</span>
                  </div>
                )}
                {cycle === "annual" && !isEnterprise && (
                  <p className="text-[11px] text-muted-foreground">billed annually</p>
                )}
              </div>

              <ul className="space-y-1.5 flex-1 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Check size={11} className="shrink-0 text-emerald-500 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" size="sm" disabled className="w-full text-xs">
                  Current Plan
                </Button>
              ) : isEnterprise ? (
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Contact Sales
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={plan.highlighted ? "default" : "outline"}
                  className={cn(
                    "w-full text-xs",
                    plan.highlighted && "gradient-brand border-0 text-white hover:opacity-90"
                  )}
                  onClick={() => onSelect(plan)}
                >
                  Select {plan.name}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function StepConfirm({
  plan,
  cycle,
  onBack,
  onConfirm,
}: {
  plan:      Plan;
  cycle:     BillingCycle;
  onBack:    () => void;
  onConfirm: () => void;
}) {
  const price      = cycle === "annual" ? plan.annualPrice! : plan.monthlyPrice!;
  const billed     = cycle === "annual" ? price * 12 : price;
  const { brand, last4, expMonth, expYear } = MOCK_PAYMENT_METHOD;
  const exp        = `${String(expMonth).padStart(2, "0")}/${expYear}`;
  const brandLabel = brand === "visa" ? "Visa" : brand === "mastercard" ? "Mastercard" : "Card";

  const next = new Date();
  cycle === "annual" ? next.setFullYear(next.getFullYear() + 1) : next.setMonth(next.getMonth() + 1);
  const nextDate = next.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirm Your Plan</DialogTitle>
        <DialogDescription>
          Review your order before subscribing.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{cycle} billing</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums">${price}/mo</p>
            {cycle === "annual" && (
              <p className="text-xs text-muted-foreground">${billed} billed today</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background">
              <CreditCard size={14} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{brandLabel} •••• {last4}</p>
              <p className="text-xs text-muted-foreground">Expires {exp}</p>
            </div>
          </div>
          <button className="text-xs font-medium text-primary hover:underline">
            Change
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock size={13} />
            Next billing date
          </div>
          <span className="text-xs font-semibold">{nextDate}</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
        <span className="text-sm font-semibold">
          {cycle === "annual" ? "Total charged today" : "Due today"}
        </span>
        <span className="text-lg font-bold tabular-nums">${billed}.00</span>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <Button
          className="flex-1 gradient-brand border-0 text-white hover:opacity-90 text-sm"
          onClick={onConfirm}
        >
          Confirm & Subscribe
        </Button>
      </div>
    </>
  );
}

export function UpgradePlanModal({ open, onClose, currentPlanId }: Props) {
  const [step,   setStep]   = useState<Step>("select");
  const [cycle,  setCycle]  = useState<BillingCycle>("monthly");
  const [selected, setSelected] = useState<Plan | null>(null);

  function handleSelect(plan: Plan) {
    setSelected(plan);
    setStep("confirm");
  }

  function handleConfirm() {
    onClose();
    setTimeout(() => { setStep("select"); setSelected(null); }, 300);
    toast.success(`You're now on the ${selected?.name} Plan`, {
      description: "Your subscription has been updated successfully.",
    });
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
          <StepSelect
            currentPlanId={currentPlanId}
            cycle={cycle}
            onCycleChange={setCycle}
            onSelect={handleSelect}
          />
        ) : (
          <StepConfirm
            plan={selected!}
            cycle={cycle}
            onBack={handleBack}
            onConfirm={handleConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
