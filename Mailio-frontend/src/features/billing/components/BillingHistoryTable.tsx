"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { billingService, type CreditHistoryEntry, type CreditTxType } from "@/src/services/billingService";

type BadgeCfg = { label: string; textColor: string; bgColor: string; dotColor: string };

const TYPE_CONFIG: Record<CreditTxType, BadgeCfg> = {
  ALLOCATION: { label: "Added",    textColor: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200",  dotColor: "bg-emerald-500" },
  REFUND:     { label: "Refund",   textColor: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200",  dotColor: "bg-emerald-400" },
  DEDUCTION:  { label: "Used",     textColor: "text-red-600",     bgColor: "bg-red-50 border-red-200",          dotColor: "bg-red-500"     },
  RESERVATION:{ label: "Reserved", textColor: "text-amber-700",   bgColor: "bg-amber-50 border-amber-200",      dotColor: "bg-amber-400"   },
  ADJUSTMENT: { label: "Adjusted", textColor: "text-blue-700",    bgColor: "bg-blue-50 border-blue-200",        dotColor: "bg-blue-400"    },
};

const REASON_CONFIG: Partial<Record<string, BadgeCfg>> = {
  BULK_VERIFY_RESERVE: { label: "Bulk Job",    textColor: "text-violet-700", bgColor: "bg-violet-50 border-violet-200",  dotColor: "bg-violet-500" },
  BULK_VERIFY_REFUND:  { label: "Bulk Refund", textColor: "text-emerald-700",bgColor: "bg-emerald-50 border-emerald-200",dotColor: "bg-emerald-400" },
  SINGLE_VERIFY:       { label: "Used",        textColor: "text-red-600",    bgColor: "bg-red-50 border-red-200",        dotColor: "bg-red-500"    },
};

function getBadge(row: { type: CreditTxType; reason: string }): BadgeCfg {
  return REASON_CONFIG[row.reason] ?? TYPE_CONFIG[row.type] ?? TYPE_CONFIG.ADJUSTMENT;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function BillingHistoryTable() {
  const [rows,    setRows]    = useState<CreditHistoryEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    billingService.getHistory(page, limit)
      .then((res) => { setRows(res.data); setTotal(res.total); })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <Card className="rounded-2xl border border-border/70 shadow-sm">
      <CardContent className="pt-5 space-y-4">
        <div>
          <h2 className="text-base font-bold">Credit History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All credit transactions on your account</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/70">
          {loading ? (
            <div className="flex items-center justify-center py-14 gap-2 text-muted-foreground text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">
              No transactions yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border/70">
                  {["Description", "Date", "Credits", "Balance After", "Type"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((row) => {
                  const cfg      = getBadge(row);
                  const isCredit = row.delta > 0;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full shrink-0",
                            isCredit ? "bg-emerald-50" : "bg-red-50",
                          )}>
                            {isCredit
                              ? <ArrowUpRight size={12} className="text-emerald-600" />
                              : <ArrowDownRight size={12} className="text-red-500" />
                            }
                          </div>
                          <span className="text-xs font-medium text-foreground truncate">
                            {row.description ?? row.reason}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-xs font-bold tabular-nums whitespace-nowrap",
                        isCredit ? "text-emerald-600" : "text-red-500",
                      )}>
                        {isCredit ? "+" : ""}{row.delta.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {row.balanceAfter.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                          cfg.bgColor, cfg.textColor,
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotColor)} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">{total} total transactions</span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/70 disabled:opacity-40 hover:bg-muted/40 transition-colors font-medium"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-xs bg-muted/40 rounded-lg font-medium">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/70 disabled:opacity-40 hover:bg-muted/40 transition-colors font-medium"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
