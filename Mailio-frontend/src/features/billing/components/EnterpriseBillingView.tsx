"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Wallet, TrendingDown, Building2, ArrowUpRight, ArrowDownRight,
  Zap, Star, Check, Info, CalendarClock, AlertCircle, Loader2,
} from "lucide-react";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  enterpriseService,
  type EnterpriseOverview,
  type EnterpriseLedgerEntry,
  type EnterpriseCreditSummary,
  type PurchasePlanResult,
} from "@/src/services/enterpriseService";
import {
  billingService,
  type BillingPlan,
  type CurrentSubscription,
} from "@/src/services/billingService";
import type { ApiError } from "@/src/types/auth";
import { cn } from "@/src/lib/utils";
import { ConfirmPlanModal } from "./ConfirmPlanModal";

// ── Credit overview card ──────────────────────────────────────────────────────

function CreditOverviewCard({
  overview, summary, loading,
}: {
  overview: EnterpriseOverview | null;
  summary:  EnterpriseCreditSummary | null;
  loading:  boolean;
}) {
  const balance  = overview?.enterprise.creditBalance ?? 0;
  const used     = overview?.enterprise.creditsUsed ?? 0;
  const name     = overview?.enterprise.name ?? "—";
  const expiresAt = summary?.expiresAt ?? null;
  const daysLeft  = summary?.daysRemaining ?? null;

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
            <p className="text-2xl font-bold tabular-nums">{loading ? "—" : balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">credits remaining</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown size={13} className="text-orange-500" />
              <p className="text-xs text-muted-foreground">Credits Used</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{loading ? "—" : used.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">total consumed</p>
          </div>
        </div>

        {/* Expiry banner */}
        {!loading && expiresAt && (
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
            (daysLeft !== null && daysLeft <= 7)
              ? "bg-red-50 border border-red-100 text-red-700"
              : "bg-amber-50 border border-amber-100 text-amber-700",
          )}>
            <CalendarClock size={13} className="shrink-0" />
            Credits expire on{" "}
            <strong>{new Date(expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</strong>
            {daysLeft !== null && ` (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)`}
          </div>
        )}

        {/* Allocation summary */}
        {!loading && summary && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Total Purchased",  value: summary.totalPurchased },
              { label: "Allocated",        value: summary.totalAllocated },
              { label: "Admin Usable",     value: summary.adminUsable },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-muted/30 border border-border px-2 py-2">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-sm font-bold">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Member usage card ─────────────────────────────────────────────────────────

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
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {[
              { label: "Total Members",       value: total.toLocaleString() },
              { label: "Active Members",      value: active.toLocaleString() },
              { label: "Total Verifications", value: verifs.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5">
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

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  hasActivePlan,
  onSelect,
}: {
  plan: BillingPlan;
  hasActivePlan: boolean;
  onSelect: (p: BillingPlan) => void;
}) {
  const isTopup = plan.planCategory === "TOPUP";
  const blocked = isTopup && !hasActivePlan;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-5 transition-all duration-200",
        blocked
          ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
          : plan.isPopular
          ? "border-primary shadow-lg shadow-primary/10 bg-gradient-to-b from-primary/[0.04] to-transparent"
          : "border-border bg-card hover:border-primary/30 hover:shadow-md",
      )}
    >
      {plan.isPopular && !blocked && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full gradient-brand px-3 py-1 text-[11px] font-semibold text-white shadow whitespace-nowrap">
          <Star size={9} fill="white" />Most Popular
        </span>
      )}
      {isTopup && (
        <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
          Topup
        </span>
      )}
      <div className="flex items-center gap-2 mb-3 mt-1">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", plan.isPopular ? "bg-primary/10" : "bg-muted/60")}>
          <Zap size={15} className={plan.isPopular ? "text-primary" : "text-muted-foreground"} />
        </div>
        <span className={cn("text-sm font-bold", plan.isPopular ? "text-primary" : "text-foreground")}>{plan.name}</span>
      </div>
      <div className="mb-4">
        <p className="text-3xl font-extrabold tabular-nums leading-none">{plan.currency}{plan.price.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1.5">
          {plan.credits.toLocaleString()} credits
          {isTopup
            ? " • shares active plan expiry"
            : ` • ${plan.validityDays ?? "—"} days validity`}
        </p>
      </div>
      <ul className="space-y-2 flex-1 mb-5">
        {(plan.features ?? []).map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check size={13} className="shrink-0 text-emerald-500 mt-0.5" />{f}
          </li>
        ))}
        {blocked && (
          <li className="flex items-start gap-2 text-xs text-amber-600">
            <Info size={13} className="shrink-0 mt-0.5" />Requires an active plan
          </li>
        )}
      </ul>
      <div className="border-t border-border/50 mb-4" />
      <Button
        size="sm"
        disabled={blocked}
        className={cn(
          "w-full text-xs h-9 font-semibold",
          blocked
            ? "opacity-50 cursor-not-allowed"
            : plan.isPopular
            ? "gradient-brand border-0 text-white hover:opacity-90"
            : "border border-primary/50 text-primary bg-primary/5 hover:bg-primary hover:text-white transition-colors",
        )}
        onClick={() => !blocked && onSelect(plan)}
      >
        {isTopup ? `Add ${plan.name}` : plan.isPopular ? `Get ${plan.name}` : `Select ${plan.name}`}
      </Button>
    </div>
  );
}

// ── Plans section ─────────────────────────────────────────────────────────────

function PlansSection({
  plans,
  loading,
  hasActivePlan,
  onSelect,
}: {
  plans: BillingPlan[];
  loading: boolean;
  hasActivePlan: boolean;
  onSelect: (p: BillingPlan) => void;
}) {
  const validityPlans = plans.filter((p) => p.planCategory !== "TOPUP");
  const topupPlans    = plans.filter((p) => p.planCategory === "TOPUP");

  const PlanGrid = ({ items }: { items: BillingPlan[] }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((plan) => (
        <PlanCard key={plan.id} plan={plan} hasActivePlan={hasActivePlan} onSelect={onSelect} />
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold">Enterprise Plans</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Choose a plan to add credits to your enterprise account.</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info size={12} />
          Most Popular badge is managed by admin.
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No enterprise plans available at this time. Contact your administrator.
          </CardContent>
        </Card>
      ) : (
        <>
          {validityPlans.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Validity-Based Plans</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Fixed credits with a validity period. Stacks with your current plan.</p>
              </div>
              <PlanGrid items={validityPlans} />
            </div>
          )}

          {topupPlans.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Topup Plans</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Add extra credits to your existing plan's balance and expiry.</p>
              </div>
              <PlanGrid items={topupPlans} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Ledger table ──────────────────────────────────────────────────────────────

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
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-3 py-2.5"><div className="h-4 w-24 rounded bg-muted/60 animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">No transactions yet.</td></tr>
              ) : (
                entries.map((entry, i) => {
                  const isCredit = entry.delta > 0;
                  return (
                    <tr key={entry.id} className={cn("border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors", i % 2 === 1 && "bg-muted/[0.04]")}>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {isCredit ? <ArrowUpRight size={13} className="shrink-0 text-emerald-500" /> : <ArrowDownRight size={13} className="shrink-0 text-red-500" />}
                          <span className="truncate text-xs">{entry.description ?? entry.reason ?? entry.type}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className={cn("px-3 py-2.5 text-xs font-semibold whitespace-nowrap tabular-nums", isCredit ? "text-emerald-600" : "text-red-500")}>
                        {isCredit ? "+" : ""}{entry.delta.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap tabular-nums">{entry.balanceAfter.toLocaleString()}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          isCredit ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-600",
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", isCredit ? "bg-emerald-500" : "bg-red-500")} />
                          {isCredit ? "Credit" : "Debit"}
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

// ── Reallocation modal ────────────────────────────────────────────────────────

function ReallocationModal({
  result,
  plan,
  onClose,
  onConfirmed,
}: {
  result:      PurchasePlanResult;
  plan:        BillingPlan;
  onClose:     () => void;
  onConfirmed: () => void;
}) {
  const users = result.users ?? [];
  const [amounts, setAmounts] = useState<Record<string, string>>(
    () => Object.fromEntries(users.map((u) => [u.id, String(u.previousAllocation)])),
  );
  const [err,  setErr]  = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = Object.values(amounts).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  const remaining = result.creditBalance - total;

  const handleConfirm = async () => {
    setErr(null);
    const allocations = users.map((u) => ({ userId: u.id, amount: parseInt(amounts[u.id] ?? "0", 10) || 0 }));

    for (const alloc of allocations) {
      const u = users.find((x) => x.id === alloc.userId);
      if (u && alloc.amount < u.used) {
        setErr(`${u.name}'s allocation cannot be less than their used credits (${u.used.toLocaleString()}).`);
        return;
      }
    }
    if (total > result.creditBalance) {
      setErr(`Total allocations (${total.toLocaleString()}) exceed plan credits (${result.creditBalance.toLocaleString()}).`);
      return;
    }

    setBusy(true);
    try {
      await enterpriseService.confirmReallocation(plan.id, allocations);
      toast.success("Credits reallocated successfully.");
      onConfirmed();
      onClose();
    } catch (e) {
      setErr((e as ApiError)?.message ?? "Failed to confirm reallocation.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <AlertCircle size={18} className="text-amber-500 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-gray-900">Re-allocate Credits</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              New plan has {result.creditBalance.toLocaleString()} credits. Adjust allocations for each member.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-3">
          {users.map((u) => {
            const val = parseInt(amounts[u.id] ?? "0", 10) || 0;
            const isUnderUsed = val < u.used;
            return (
              <div key={u.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email} · used {u.used.toLocaleString()}</p>
                </div>
                <div className="w-32 shrink-0">
                  <input
                    type="number"
                    min={u.used}
                    value={amounts[u.id] ?? ""}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    disabled={busy}
                    className={cn(
                      "w-full rounded-lg border px-3 py-1.5 text-sm text-right",
                      isUnderUsed ? "border-red-300 bg-red-50" : "border-gray-300",
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">Unallocated (kept in pool)</span>
          <span className={cn("font-bold tabular-nums", remaining < 0 ? "text-red-600" : "text-gray-900")}>
            {remaining.toLocaleString()}
          </span>
        </div>

        {err && (
          <div className="px-6 py-3 border-t border-red-100 bg-red-50 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={busy || remaining < 0}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : "Confirm Allocations"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Root view ─────────────────────────────────────────────────────────────────

export function EnterpriseBillingView() {
  const plansRef = useRef<HTMLDivElement>(null);

  const [overview,     setOverview]     = useState<EnterpriseOverview | null>(null);
  const [summary,      setSummary]      = useState<EnterpriseCreditSummary | null>(null);
  const [ledger,       setLedger]       = useState<EnterpriseLedgerEntry[]>([]);
  const [plans,        setPlans]        = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [confirmPlan,  setConfirmPlan]  = useState<BillingPlan | null>(null);
  const [realloc,      setRealloc]      = useState<{ result: PurchasePlanResult; plan: BillingPlan } | null>(null);

  const refresh = async () => {
    try {
      const [ov, cs, led, sub] = await Promise.all([
        enterpriseService.getOverview(),
        enterpriseService.getCreditSummary(),
        enterpriseService.getLedger(1, 30),
        enterpriseService.getCurrentSubscription().catch(() => null),
      ]);
      setOverview(ov);
      setSummary(cs);
      setLedger(led.data);
      setSubscription(sub);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        await refresh();
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
    billingService.getPlans().then(setPlans).catch(() => setPlans([])).finally(() => setLoadingPlans(false));
  }, []);

  async function handleActivated(plan: BillingPlan, result?: PurchasePlanResult) {
    if (result?.needsReallocation) {
      setRealloc({ result, plan });
      toast.info("Credits changed — please re-allocate to your team members.");
    } else {
      toast.success(`${plan.name} activated!`, {
        description: `${plan.credits.toLocaleString()} credits added to your enterprise account.`,
      });
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Plans" subtitle="Enterprise credit balance, plans, and transaction history." />
      <div className="px-4 lg:px-6 space-y-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CreditOverviewCard overview={overview} summary={summary} loading={loading} />
          </div>
          <div className="lg:col-span-1">
            <MemberUsageCard overview={overview} loading={loading} />
          </div>
        </div>

        {subscription && (subscription.activeBase || subscription.queued.length > 0) && (
          <Card className="border-border/60">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Subscription Timeline</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Active plan + queued upcoming plans</p>
                </div>
              </div>
              {subscription.activeBase && (
                <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold"><span className="text-primary">Active:</span> {subscription.activeBase.planName}</p>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {subscription.activeBase.remainingCredits.toLocaleString()} / {subscription.activeBase.totalCredits.toLocaleString()} remaining
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(subscription.activeBase.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    {subscription.activeBase.endDate && ` → ${new Date(subscription.activeBase.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                </div>
              )}
              {subscription.activeTopups.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  +{subscription.activeTopups.length} active top-up{subscription.activeTopups.length > 1 ? "s" : ""}, total {subscription.activeTopups.reduce((s, t) => s + t.remainingCredits, 0).toLocaleString()} extra credits remaining
                </div>
              )}
              {subscription.queued.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Queued</p>
                  {subscription.queued.map((q) => (
                    <div key={q.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between text-xs">
                      <span className="font-medium">{q.planName}</span>
                      <span className="text-muted-foreground">
                        Starts {new Date(q.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} • {q.totalCredits.toLocaleString()} credits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div ref={plansRef}>
          <PlansSection
            plans={plans}
            loading={loadingPlans}
            hasActivePlan={
              !!subscription?.activeBase ||
              (summary?.expiresAt !== null &&
                summary?.expiresAt !== undefined &&
                new Date(summary.expiresAt) > new Date())
            }
            onSelect={setConfirmPlan}
          />
        </div>

        <LedgerTable entries={ledger} loading={loading} />
      </div>

      <ConfirmPlanModal
        plan={confirmPlan}
        onClose={() => setConfirmPlan(null)}
        onActivated={handleActivated}
      />

      {realloc && (
        <ReallocationModal
          result={realloc.result}
          plan={realloc.plan}
          onClose={() => setRealloc(null)}
          onConfirmed={async () => { await refresh(); }}
        />
      )}
    </div>
  );
}
