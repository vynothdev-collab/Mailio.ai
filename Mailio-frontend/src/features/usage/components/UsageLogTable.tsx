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

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
        setError((err as ApiError)?.message ?? "Failed to load usage log.");
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
      <CardContent className="pt-3 space-y-2 sm:space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-xs sm:text-sm font-semibold">Usage Log</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Recent credit consumption</p>
            </div>
            {loading && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5 sm:p-1">
            {TYPE_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleFilter(value)}
                className={cn(
                  "rounded-md px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium transition-colors",
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

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-left text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">Email / File</th>
                <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-left text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">Type</th>
                <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-left text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">Credits</th>
                <th className="hidden sm:table-cell px-2 py-1.5 sm:px-3 sm:py-2 text-left text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 rounded" />
                        <Skeleton className="h-3.5 w-32 sm:h-4 sm:w-40" />
                      </div>
                    </td>
                    <td className="px-2 py-2 sm:px-3 sm:py-2.5"><Skeleton className="h-4 w-10 sm:w-14 rounded-md" /></td>
                    <td className="px-2 py-2 sm:px-3 sm:py-2.5"><Skeleton className="h-3.5 w-10 sm:w-14" /></td>
                    <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-2.5"><Skeleton className="h-3.5 w-24" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs sm:text-sm text-destructive">{error}</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
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
                    <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        {row.type === "single"
                          ? <Mail     size={11} className="shrink-0 text-muted-foreground sm:hidden" />
                          : <FileText size={11} className="shrink-0 text-muted-foreground sm:hidden" />}
                        {row.type === "single"
                          ? <Mail     size={13} className="shrink-0 text-muted-foreground hidden sm:block" />
                          : <FileText size={13} className="shrink-0 text-muted-foreground hidden sm:block" />}
                        <span className="font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-56 text-[11px] sm:text-sm">
                          {row.label}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                      <span className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-xs font-medium",
                        row.type === "single" ? "bg-blue-50 text-blue-700" : "bg-fuchsia-50 text-fuchsia-700",
                      )}>
                        {row.type === "single" ? "Single" : "Bulk"}
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-3 sm:py-2.5 tabular-nums font-semibold text-[11px] sm:text-sm">
                      {formatNumber(row.credits)}
                    </td>
                    <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-2.5 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      <span className="hidden md:inline">{formatDate(row.occurredAt)}</span>
                      <span className="md:hidden">{formatDateShort(row.occurredAt)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-2 border border-border rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 bg-white">
          {/* Left: Showing X–Y of Z records */}
          <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
            {total === 0 ? (
              "No records found"
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-foreground">{start}–{end}</span>
                {" "}of{" "}
                <span className="font-semibold text-foreground">{total}</span> records
              </>
            )}
          </p>

          {/* Right: Prev  Page X / Y  Next */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 sm:h-8 gap-1 px-2 sm:px-3 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground"
              aria-label="Previous page"
            >
              <ChevronLeft size={13} /> Prev
            </Button>

            <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums select-none">
              Page{" "}
              <span className="font-bold text-foreground">{page}</span>
              {" / "}
              {totalPages}
            </span>

            <Button
              size="sm"
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 sm:h-8 gap-1 px-2 sm:px-3 text-[10px] sm:text-xs bg-foreground text-background hover:bg-foreground/90"
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
