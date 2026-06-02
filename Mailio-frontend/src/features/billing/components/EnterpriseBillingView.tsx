"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Wallet, TrendingDown, Building2, ArrowUpRight, ArrowDownRight,
  Zap, Star, Check, Info,
} from "lucide-react";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  enterpriseService,
  type EnterpriseOverview,
  type EnterpriseLedgerEntry,
} from "@/src/services/enterpriseService";
import { billingService, type BillingPlan } from "@/src/services/billingService";
import type { ApiError } from "@/src/types/auth";
import { cn } from "@/src/lib/utils";
import { ConfirmPlanModal } from "./ConfirmPlanModal";

// ── Credit overview card ───────────────────────────────────────────────────

function CreditOverviewCard({ overview, loading }: { overview: EnterpriseOverview | null; loading: boolean }) {
  const balance = overview?.enterprise.creditBalance ?? 0;
  const used    = overview?.enterprise.creditsUsed ?? 0;
  const name    = overview?.enterprise.name ?? "—";

  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Building2 size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{loading ? "Loading…" : name}</p>
            <p className="text-xs text-muted-foreground">Enterprise account</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet size={13} className="text-blue-500" />
              <p className="text-xs text-muted-foreground">Credit Balance</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {loading ? "—" : balance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">credits remaining</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown size={13} className="text-orange-500" />
              <p className="text-xs text-muted-foreground">Credits Used</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {loading ? "—" : used.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">total consumed</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
          Credits are shared across all enterprise members and allocated by your Super Admin.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Member usage card ──────────────────────────────────────────────────────

function MemberUsageCard({ overview, loading }: { overview: EnterpriseOverview | null; loading: boolean }) {
  const total  = overview?.users.total ?? 0;
  const active = overview?.users.active ?? 0;
  const verifs = overview?.verifications.total ?? 0;

  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Team Usage</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Verification activity across the enterprise</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {[
              { label: "Total Members",       value: total.toLocaleString()  },
              { label: "Active Members",      value: active.toLocaleString() },
              { label: "Total Verifications", value: verifs.toLocaleString() },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5"
              >
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold">{value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Plan cards ─────────────────────────────────────────────────────────────

function PlanCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
    </div>
  );
}

function PlansSection({
  plans,
  loading,
  onSelect,
}: {
  plans: BillingPlan[];
  loading: boolean;
  onSelect: (plan: BillingPlan) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold">Enterprise Plans</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose a plan to add credits to your enterprise account.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info size={12} />
          Most Popular badge is managed by admin.
        </span>
      </div>

      {loading ? <PlanCardSkeleton /> : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No enterprise plans available at this time. Contact your administrator.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl border p-5 transition-all duration-200",
                plan.isPopular
                  ? "border-primary shadow-lg shadow-primary/10 bg-gradient-to-b from-primary/[0.04] to-transparent"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-md",
              )}
            >
              {plan.isPopular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full gradient-brand px-3 py-1 text-[11px] font-semibold text-white shadow whitespace-nowrap">
                  <Star size={9} fill="white" />
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-2 mb-3 mt-1">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                  plan.isPopular ? "bg-primary/10" : "bg-muted/60",
                )}>
                  <Zap size={15} className={plan.isPopular ? "text-primary" : "text-muted-foreground"} />
                </div>
                <span className={cn("text-sm font-bold", plan.isPopular ? "text-primary" : "text-foreground")}>
                  {plan.name}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-3xl font-extrabold tabular-nums leading-none">
                  {plan.currency}{plan.price.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {plan.credits.toLocaleString()} credits • {plan.validityDays} days validity
                </p>
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {(plan.features ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check size={13} className="shrink-0 text-emerald-500 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="border-t border-border/50 mb-4" />

              <Button
                size="sm"
                className={cn(
                  "w-full text-xs h-9 font-semibold",
                  plan.isPopular
                    ? "gradient-brand border-0 text-white hover:opacity-90"
                    : "border border-primary/50 text-primary bg-primary/5 hover:bg-primary hover:text-white transition-colors",
                )}
                onClick={() => onSelect(plan)}
              >
                {plan.isPopular ? `Get ${plan.name}` : `Select ${plan.name}`}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ledger table ───────────────────────────────────────────────────────────

type LedgerStatus = "credit" | "debit";

const STATUS_CONFIG: Record<LedgerStatus, { label: string; textColor: string; bgColor: string; dotColor: string }> = {
  credit: { label: "Credit", textColor: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-100", dotColor: "bg-emerald-500" },
  debit:  { label: "Debit",  textColor: "text-red-600",     bgColor: "bg-red-50 border-red-100",         dotColor: "bg-red-500"     },
};

function LedgerTable({ entries, loading }: { entries: EnterpriseLedgerEntry[]; loading: boolean }) {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Credit History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All credit transactions for your enterprise</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Description", "Date", "Amount", "Balance After", "Type"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <div className="h-4 w-24 rounded bg-muted/60 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry, i) => {
                  const isCredit = entry.delta > 0;
                  const cfg = STATUS_CONFIG[isCredit ? "credit" : "debit"];
                  return (
                    <tr
                      key={entry.id}
                      className={cn(
                        "border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors",
                        i % 2 === 1 && "bg-muted/[0.04]",
                      )}
                    >
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {isCredit
                            ? <ArrowUpRight size={13} className="shrink-0 text-emerald-500" />
                            : <ArrowDownRight size={13} className="shrink-0 text-red-500" />
                          }
                          <span className="truncate text-xs">
                            {entry.description ?? entry.reason ?? entry.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className={cn("px-3 py-2.5 text-xs font-semibold whitespace-nowrap tabular-nums", isCredit ? "text-emerald-600" : "text-red-500")}>
                        {isCredit ? "+" : ""}{entry.delta.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {entry.balanceAfter.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", cfg.bgColor, cfg.textColor)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Root view ─────────────────────────────────────────────────────────────

export function EnterpriseBillingView() {
  const plansRef = useRef<HTMLDivElement>(null);

  const [overview,      setOverview]      = useState<EnterpriseOverview | null>(null);
  const [ledger,        setLedger]        = useState<EnterpriseLedgerEntry[]>([]);
  const [plans,         setPlans]         = useState<BillingPlan[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadingPlans,  setLoadingPlans]  = useState(true);
  const [confirmPlan,   setConfirmPlan]   = useState<BillingPlan | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const [ov, led] = await Promise.all([
          enterpriseService.getOverview(),
          enterpriseService.getLedger(1, 30),
        ]);
        if (controller.signal.aborted) return;
        setOverview(ov);
        setLedger(led.data);
      } catch (err) {
        if (controller.signal.aborted) return;
        toast.error((err as ApiError)?.message ?? "Failed to load billing data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    billingService.getPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, []);

  async function handleActivated(plan: BillingPlan) {
    toast.success(`${plan.name} activated!`, {
      description: `${plan.credits.toLocaleString()} credits added to your enterprise account.`,
    });
    // Refresh overview to show updated balance
    try {
      const ov = await enterpriseService.getOverview();
      setOverview(ov);
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Plans"
        subtitle="Enterprise credit balance, plans, and transaction history."
      />
      <div className="px-4 lg:px-6 space-y-8">

        {/* ── Top: Overview + Team Usage ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CreditOverviewCard overview={overview} loading={loading} />
          </div>
          <div className="lg:col-span-1">
            <MemberUsageCard overview={overview} loading={loading} />
          </div>
        </div>

        {/* ── Enterprise Plans ── */}
        <div ref={plansRef}>
          <PlansSection
            plans={plans}
            loading={loadingPlans}
            onSelect={setConfirmPlan}
          />
        </div>

        {/* ── Credit History ── */}
        <LedgerTable entries={ledger} loading={loading} />

      </div>

      <ConfirmPlanModal
        plan={confirmPlan}
        onClose={() => setConfirmPlan(null)}
        onActivated={handleActivated}
      />
    </div>
  );
}
