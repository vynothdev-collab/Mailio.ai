"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, cn } from "@/src/lib/utils";
import { usageService } from "@/src/services/usageService";
import type { ApiError } from "@/src/types/auth";
import type { UsageLogItem, UsageType } from "@/src/types/usage";

const TYPE_OPTIONS: { label: string; value: UsageType }[] = [
  { label: "All",    value: "all"    },
  { label: "Single", value: "single" },
  { label: "Bulk",   value: "bulk"   },
];

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function UsageLogTable() {
  const [type,    setType]    = useState<UsageType>("all");
  const [page,    setPage]    = useState(1);
  const [rows,    setRows]    = useState<UsageLogItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    usageService
      .getLog(page, PAGE_SIZE, type, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setRows(res.data);
        setTotal(res.total);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const apiErr = err as ApiError;
        setError(apiErr?.message ?? "Failed to load usage log.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, type]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start      = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end        = Math.min(page * PAGE_SIZE, total);
  const canPrev    = page > 1 && !loading;
  const canNext    = page < totalPages && !loading;

  const handleFilter = (value: UsageType) => {
    setType(value);
    setPage(1);
  };

  return (
    <Card>
      <CardContent className="pt-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-sm font-semibold">Usage Log</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current billing period — {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
            </div>
            {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {TYPE_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleFilter(value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  type === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Email / File", "Type", "Credits Used", "Date & Time"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={4} className="px-3 py-2.5"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-destructive">{error}</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No entries for this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors hover:bg-muted/20",
                      i % 2 === 1 && "bg-muted/10",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        {row.type === "single"
                          ? <Mail size={13} className="shrink-0 text-muted-foreground" />
                          : <FileText size={13} className="shrink-0 text-muted-foreground" />}
                        <span className="font-medium truncate max-w-56">{row.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        row.type === "single" ? "bg-blue-50 text-blue-700" : "bg-fuchsia-50 text-fuchsia-700",
                      )}>
                        {row.type === "single" ? "Single" : "Bulk"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold">
                      {formatNumber(row.credits)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(row.occurredAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground tabular-nums">
            {total === 0
              ? "No records"
              : <>Showing <span className="font-medium text-foreground">{start}</span>–<span className="font-medium text-foreground">{end}</span> of <span className="font-medium text-foreground">{total}</span></>
            }
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1 h-7 px-2 text-xs"
              aria-label="Previous page"
            >
              <ChevronLeft size={13} /> Prev
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums px-2">
              Page <span className="font-medium text-foreground">{page}</span> / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="gap-1 h-7 px-2 text-xs"
              aria-label="Next page"
            >
              Next <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
