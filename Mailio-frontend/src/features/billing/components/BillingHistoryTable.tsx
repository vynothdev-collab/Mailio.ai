"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { billingService, type CreditHistoryEntry, type CreditTxType } from "@/src/services/billingService";

type BadgeCfg = { label: string; textColor: string; bgColor: string; dotColor: string };

const TYPE_CONFIG: Record<CreditTxType, BadgeCfg> = {
  ALLOCATION: { label: "Added",    textColor: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-100", dotColor: "bg-emerald-500" },
  REFUND:     { label: "Refund",   textColor: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-100", dotColor: "bg-emerald-400" },
  DEDUCTION:  { label: "Used",     textColor: "text-red-600",     bgColor: "bg-red-50 border-red-100",         dotColor: "bg-red-500"     },
  RESERVATION:{ label: "Reserved", textColor: "text-amber-700",   bgColor: "bg-amber-50 border-amber-100",     dotColor: "bg-amber-400"   },
  ADJUSTMENT: { label: "Adjusted", textColor: "text-blue-700",    bgColor: "bg-blue-50 border-blue-100",       dotColor: "bg-blue-400"    },
};

const REASON_CONFIG: Partial<Record<string, BadgeCfg>> = {
  BULK_VERIFY_RESERVE: { label: "Bulk Job",   textColor: "text-violet-700", bgColor: "bg-violet-50 border-violet-100", dotColor: "bg-violet-500" },
  BULK_VERIFY_REFUND:  { label: "Bulk Refund",textColor: "text-emerald-700",bgColor: "bg-emerald-50 border-emerald-100",dotColor: "bg-emerald-400" },
  SINGLE_VERIFY:       { label: "Used",       textColor: "text-red-600",    bgColor: "bg-red-50 border-red-100",        dotColor: "bg-red-500"    },
};

function getBadge(row: { type: CreditTxType; reason: string }): BadgeCfg {
  return REASON_CONFIG[row.reason] ?? TYPE_CONFIG[row.type] ?? TYPE_CONFIG.ADJUSTMENT;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function BillingHistoryTable() {
  const [rows, setRows] = useState<CreditHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
    <Card>
      <CardContent className="pt-3 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Credit History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All credit transactions on your account</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No transactions yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Description", "Date", "Credits", "Balance After", "Type"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const cfg = getBadge(row);
                  const isCredit = row.delta > 0;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-border last:border-0 transition-colors hover:bg-muted/20",
                        i % 2 === 1 && "bg-muted/10"
                      )}
                    >
                      <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                        {row.description ?? row.reason}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className={cn("px-3 py-2.5 tabular-nums font-semibold", isCredit ? "text-emerald-600" : "text-red-600")}>
                        {isCredit ? "+" : ""}{row.delta.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                        {row.balanceAfter.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
                          cfg.bgColor, cfg.textColor
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
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
            <span className="text-xs text-muted-foreground">{total} transactions</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40 hover:bg-muted/30"
              >
                Prev
              </button>
              <span className="px-2 py-1 text-xs">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40 hover:bg-muted/30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
