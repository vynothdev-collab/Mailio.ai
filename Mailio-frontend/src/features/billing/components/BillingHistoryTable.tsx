import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { MOCK_INVOICES } from "../mock";
import type { InvoiceStatus } from "../types";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; textColor: string; bgColor: string; dotColor: string }> = {
  paid:    { label: "Paid",    textColor: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-100", dotColor: "bg-emerald-500" },
  failed:  { label: "Failed",  textColor: "text-red-600",     bgColor: "bg-red-50 border-red-100",         dotColor: "bg-red-500"     },
  pending: { label: "Pending", textColor: "text-amber-700",   bgColor: "bg-amber-50 border-amber-100",     dotColor: "bg-amber-400"   },
};

export function BillingHistoryTable() {
  return (
    <Card>
      <CardContent className="pt-3 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Billing History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All past invoices and payments</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Invoice", "Date", "Amount", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((inv, i) => {
                const cfg = STATUS_CONFIG[inv.status];
                return (
                  <tr
                    key={inv.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors hover:bg-muted/20",
                      i % 2 === 1 && "bg-muted/10"
                    )}
                  >
                    <td className="px-3 py-2.5 font-medium">{inv.label}</td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{inv.date}</td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold">${inv.amount}.00</td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
                        cfg.bgColor, cfg.textColor
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2">
                        <Download size={12} /> PDF
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
