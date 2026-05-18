"use client";

import { useState } from "react";
import { Check, CalendarClock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { MOCK_CURRENT_PLAN } from "../mock";
import { UpgradePlanModal } from "./UpgradePlanModal";
import type { BillingCycle } from "../types";

export function CurrentPlanCard() {
  const plan = MOCK_CURRENT_PLAN;
  const [cycle, setCycle]       = useState<BillingCycle>(plan.cycle);
  const [modalOpen, setModalOpen] = useState(false);

  const price   = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const savings = Math.round(((plan.monthlyPrice - plan.annualPrice) / plan.monthlyPrice) * 100);

  return (
    <Card>
      <CardContent className="pt-3 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Zap size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="text-xs text-muted-foreground">Your current plan</p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {(["monthly", "annual"] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
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
        </div>

        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold tabular-nums">${price}</span>
          <span className="text-sm text-muted-foreground mb-1">/ month{cycle === "annual" && ", billed annually"}</span>
        </div>

        <ul className="space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check size={13} className="shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <CalendarClock size={13} />
          Next billing on <span className="font-semibold text-foreground ml-0.5">{plan.nextBillingDate}</span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1 gradient-brand border-0 text-white hover:opacity-90 text-sm"
            onClick={() => setModalOpen(true)}
          >
            Upgrade Plan
          </Button>
          <Button variant="outline" className="text-sm text-muted-foreground hover:text-red-600 hover:border-red-200">
            Cancel
          </Button>
        </div>
      </CardContent>

      <UpgradePlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentPlanId="pro"
      />
    </Card>
  );
}
