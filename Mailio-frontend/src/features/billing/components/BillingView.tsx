"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check, Zap, Star, CalendarDays, RefreshCw,
  Info, CreditCard, TrendingUp, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/hooks/useAuth";
import { billingService, type BillingPlan } from "@/src/services/billingService";
import { usageService } from "@/src/services/usageService";
import type { UsageQuotaDto } from "@/src/types/usage";
import { BillingHistoryTable } from "./BillingHistoryTable";
import { ConfirmPlanModal } from "./ConfirmPlanModal";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function getCurrencySymbol(currency: string) {
  try {
    return (0).toLocaleString("en-IN", { style: "currency", currency, minimumFractionDigits: 0 })
      .replace(/[\d,.\s]/g, "").trim() || currency;
  } catch {
    return currency;
  }
}

function isCurrentPlan(plan: BillingPlan, quota: UsageQuotaDto | null) {
  if (!quota) return false;
  // Prefer exact ID match (set on activation); fall back to name comparison
  if (quota.currentPlanId) return plan.id === quota.currentPlanId;
  return plan.name.toLowerCase() === (quota.plan ?? "").toLowerCase();
}

// ── Skeletons ──────────────────────────────────────────────────────────────

function TopSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

function PlanCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function BillingView() {
  const { user } = useAuth();
  const plansRef = useRef<HTMLDivElement>(null);

  const [plans,        setPlans]        = useState<BillingPlan[]>([]);
  const [quota,        setQuota]        = useState<UsageQuotaDto | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [confirmPlan,  setConfirmPlan]  = useState<BillingPlan | null>(null);

  useEffect(() => {
    billingService.getPlans()
      .then(setPlans).catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    usageService.getQuota()
      .then(setQuota).catch(() => setQuota(null))
      .finally(() => setLoadingQuota(false));
  }, []);

  function scrollToPlans() {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleActivated(plan: BillingPlan) {
    toast.success(`${plan.name} activated!`, {
      description: `${plan.credits.toLocaleString()} credits added to your account.`,
    });
    const fresh = await usageService.getQuota().catch(() => quota);
    setQuota(fresh);
  }

  const loading = loadingPlans || loadingQuota;
  const creditBalance = Number(user?.effectiveCreditBalance ?? user?.creditBalance ?? 0);
  const planLabel = quota?.plan ?? user?.plan ?? "Free";
  const renewDate = quota?.resetDate ? formatDate(quota.resetDate) : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Plans"
        subtitle="Manage your plan, credits, and billing preferences."
      />

      <div className="px-4 lg:px-6 space-y-8">

        {/* ── Top summary cards ── */}
        {loading ? <TopSkeleton /> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Current Plan card */}
            <Card className="rounded-2xl border border-border/70 shadow-sm">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <CreditCard size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Current Plan
                      </p>
                      <p className="text-base font-bold leading-tight">{planLabel}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Credits</p>
                    <p className="text-lg font-bold tabular-nums mt-0.5">{creditBalance.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <CalendarDays size={9} />Renews
                    </p>
                    <p className="text-sm font-semibold mt-0.5">{renewDate}</p>
                  </div>
                </div>

                <button
                  onClick={scrollToPlans}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                >
                  Manage Plan <ChevronRight size={13} />
                </button>
              </CardContent>
            </Card>

            {/* Credit Balance card */}
            <Card className="rounded-2xl border border-border/70 shadow-sm">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                      <TrendingUp size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Credit Balance
                      </p>
                      <p className="text-base font-bold leading-tight">
                        {creditBalance.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground ml-1">credits</span>
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Available
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Auto-renewal</p>
                    <p className="text-sm font-semibold text-emerald-600 mt-0.5">Active</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <RefreshCw size={9} />Next renewal
                    </p>
                    <p className="text-sm font-semibold mt-0.5">{renewDate}</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full gradient-brand border-0 text-white hover:opacity-90 text-xs font-semibold h-9 rounded-xl"
                  onClick={scrollToPlans}
                >
                  Buy Additional Credits
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Choose Your Plan ── */}
        <div ref={plansRef} className="space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold">Choose Your Plan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select the plan that best fits your needs.
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
              <Info size={11} />
              Popular badge is set by admin
            </span>
          </div>

          {loadingPlans ? <PlanCardSkeleton /> : plans.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No plans available at this time.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isCurrent    = isCurrentPlan(plan, quota);
                const isEnterprise = plan.planType === "ENTERPRISE";
                const isPopular    = plan.isPopular;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative flex flex-col rounded-2xl border transition-all duration-200",
                      isPopular
                        ? "border-primary shadow-xl shadow-primary/10 bg-white"
                        : "border-border/70 bg-card hover:shadow-md hover:border-primary/30",
                      isCurrent && "ring-2 ring-primary/20",
                    )}
                  >
                    {/* Popular badge */}
                    {isPopular && (
                      <div className="absolute -top-4 inset-x-0 flex justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full gradient-brand px-4 py-1.5 text-[11px] font-bold text-white shadow-md whitespace-nowrap">
                          <Star size={10} fill="white" />
                          Most Popular
                        </span>
                      </div>
                    )}


                    <div className="flex flex-col flex-1 p-5 pt-4">
                      {/* Plan name */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                          isPopular ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                        )}>
                          <Zap size={15} />
                        </div>
                        <span className={cn(
                          "text-sm font-bold capitalize",
                          isPopular ? "text-primary" : "text-foreground",
                        )}>
                          {plan.name}
                        </span>
                        {isCurrent && (
                          <span className="ml-auto text-[10px] font-semibold rounded-full bg-primary/10 text-primary px-2 py-0.5">
                            Current
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mb-5 pb-5 border-b border-border/50">
                        {isEnterprise ? (
                          <>
                            <p className={cn(
                              "text-3xl font-extrabold leading-none",
                              isPopular ? "text-primary" : "text-foreground",
                            )}>
                              Custom
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Flexible credits • Custom validity
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start gap-1">
                              <span className={cn(
                                "text-xl font-bold mt-1 leading-none",
                                isPopular ? "text-primary" : "text-foreground",
                              )}>
                                {getCurrencySymbol(plan.currency)}
                              </span>
                              <span className={cn(
                                "text-4xl font-extrabold tabular-nums leading-none",
                                isPopular ? "text-primary" : "text-foreground",
                              )}>
                                {plan.price.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-foreground mt-2">
                              {plan.credits.toLocaleString()} credits • {plan.validityDays} days validity
                              <span className="font-normal text-muted-foreground"> (including GST)</span>
                            </p>
                          </>
                        )}
                      </div>

                      {/* Features list */}
                      <ul className="space-y-2 flex-1 mb-5">
                        {(plan.features ?? []).length > 0 ? (
                          plan.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Check size={13} className="shrink-0 text-emerald-500 mt-0.5" />
                              {f}
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-muted-foreground/60 italic">
                            Contact admin for feature details.
                          </li>
                        )}
                      </ul>

                      {/* CTA */}
                      {isCurrent ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary/20 bg-primary/5 py-2.5 text-xs font-semibold text-primary">
                          <Check size={13} />
                          Current Plan
                        </div>
                      ) : isEnterprise ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-10 rounded-xl font-semibold"
                          onClick={() => toast.info("Contact our sales team at sales@emailanswers.ai")}
                        >
                          Contact Sales
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className={cn(
                            "w-full text-xs h-10 rounded-xl font-semibold",
                            isPopular
                              ? "gradient-brand border-0 text-white hover:opacity-90 shadow-md shadow-primary/20"
                              : "bg-primary text-white hover:bg-primary/90",
                          )}
                          onClick={() => setConfirmPlan(plan)}
                        >
                          {isPopular ? `Get ${plan.name}` : `Upgrade to ${plan.name}`}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Billing History ── */}
        <BillingHistoryTable />

      </div>

      <ConfirmPlanModal
        plan={confirmPlan}
        onClose={() => setConfirmPlan(null)}
        onActivated={handleActivated}
      />
    </div>
  );
}
