"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, TrendingDown, Building2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  enterpriseService,
  type EnterpriseOverview,
  type EnterpriseLedgerEntry,
} from "@/src/services/enterpriseService";
import type { ApiError } from "@/src/types/auth";
import { cn } from "@/src/lib/utils";

// ── Credit balance card (mirrors CurrentPlanCard style) ──────────────────────

function CreditOverviewCard({ overview, loading }: { overview: EnterpriseOverview | null; loading: boolean }) {
  const balance = overview?.enterprise.creditBalance ?? 0;
  const used    = overview?.enterprise.creditsUsed ?? 0;
  const name    = overview?.enterprise.name ?? "—";

  return (
    <Card>
      <CardContent className="pt-3 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Building2 size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{loading ? "Loading…" : name}</p>
              <p className="text-xs text-muted-foreground">Enterprise account</p>
            </div>
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

// ── Member usage card (mirrors PaymentMethodCard style) ──────────────────────

function MemberUsageCard({ overview, loading }: { overview: EnterpriseOverview | null; loading: boolean }) {
  const total  = overview?.users.total ?? 0;
  const active = overview?.users.active ?? 0;
  const verifs = overview?.verifications.total ?? 0;

  return (
    <Card>
      <CardContent className="pt-3 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Team Usage</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Verification activity across the enterprise</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {[
              { label: "Total Members",       value: total.toLocaleString() },
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

// ── Ledger table (mirrors BillingHistoryTable style) ─────────────────────────

type LedgerStatus = "credit" | "debit";

const STATUS_CONFIG: Record<LedgerStatus, { label: string; textColor: string; bgColor: string; dotColor: string }> = {
  credit: { label: "Credit", textColor: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-100", dotColor: "bg-emerald-500" },
  debit:  { label: "Debit",  textColor: "text-red-600",     bgColor: "bg-red-50 border-red-100",         dotColor: "bg-red-500"     },
};

function LedgerTable({ entries, loading }: { entries: EnterpriseLedgerEntry[]; loading: boolean }) {
  return (
    <Card>
      <CardContent className="pt-3 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Credit History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All credit transactions for your enterprise</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Description", "Date", "Amount", "Balance After", "Type"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  >
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
                entries.map((entry) => {
                  const isCredit = entry.delta > 0;
                  const type: LedgerStatus = isCredit ? "credit" : "debit";
                  const cfg = STATUS_CONFIG[type];
                  return (
                    <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
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
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className={cn("px-3 py-2.5 text-xs font-semibold whitespace-nowrap", isCredit ? "text-emerald-600" : "text-red-500")}>
                        {isCredit ? "+" : ""}{entry.delta.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
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

// ── Root view ─────────────────────────────────────────────────────────────────

export function EnterpriseBillingView() {
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [ledger,   setLedger]   = useState<EnterpriseLedgerEntry[]>([]);
  const [loading,  setLoading]  = useState(true);

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing"
        subtitle="Enterprise credit balance and transaction history."
      />
      <div className="px-4 lg:px-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CreditOverviewCard overview={overview} loading={loading} />
          </div>
          <div className="lg:col-span-1">
            <MemberUsageCard overview={overview} loading={loading} />
          </div>
        </div>

        <LedgerTable entries={ledger} loading={loading} />
      </div>
    </div>
  );
}
