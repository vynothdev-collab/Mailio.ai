"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, FileSpreadsheet, FileX,
  Loader2, Mail, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/src/lib/utils";
import { dashboardService } from "@/src/services/dashboardService";
import type {
  RecentVerificationItem,
  RecentVerificationStatus,
} from "@/src/types/dashboard";
import type { ApiError } from "@/src/types/auth";

const STATUS_STYLE: Record<RecentVerificationStatus, { label: string; className: string; dot: string }> = {
  queued:    { label: "Queued",    className: "bg-slate-50 text-slate-600 border-slate-200",       dot: "bg-slate-400"   },
  pending:   { label: "Pending",   className: "bg-blue-50 text-blue-700 border-blue-100",          dot: "bg-blue-500"    },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  failed:    { label: "Failed",    className: "bg-red-50 text-red-600 border-red-100",             dot: "bg-red-500"     },
};

function StatusPill({ status }: { status: RecentVerificationStatus }) {
  const cfg = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function TypeCell({ isBulk }: { isBulk: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
      isBulk
        ? "bg-blue-50 text-blue-700 border-blue-100"
        : "bg-slate-50 text-slate-600 border-slate-200",
    )}>
      {isBulk ? "Bulk" : "Single"}
    </span>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={4} className="py-12 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <FileX size={32} strokeWidth={1.5} />
          <p className="text-sm font-medium">No verifications yet</p>
          <p className="text-xs">Verify your first email to see it here.</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

const DEFAULT_LIMIT = 10;

interface RecentVerificationsTableProps {
  limit?: number;
}

type StatusFilter = "all" | RecentVerificationStatus;
type PeriodFilter = "all" | "today" | "week" | "custom";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "All Status" },
  { value: "queued",    label: "Queued" },
  { value: "pending",   label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed",    label: "Failed" },
];

const PERIOD_FILTERS: { value: PeriodFilter; label: string }[] = [
  { value: "today",  label: "Today" },
  { value: "week",   label: "This week" },
  { value: "custom", label: "Custom" },
];

export function RecentVerificationsTable({ limit = DEFAULT_LIMIT }: RecentVerificationsTableProps = {}) {
  const [page,    setPage]    = useState(1);
  const [data,    setData]    = useState<RecentVerificationItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [customFrom,   setCustomFrom]   = useState<string>("");
  const [customTo,     setCustomTo]     = useState<string>("");
  const [customOpen,   setCustomOpen]   = useState<boolean>(false);
  const customRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setCustomOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCustomOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [customOpen]);

  const load = useCallback(async (targetPage: number, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getRecentVerifications(
        {
          page:   targetPage,
          limit,
          status: statusFilter === "all" ? undefined : statusFilter,
          period: periodFilter === "all" ? undefined : periodFilter,
          from:   periodFilter === "custom" && customFrom ? new Date(customFrom).toISOString() : undefined,
          to:     periodFilter === "custom" && customTo   ? new Date(customTo).toISOString()   : undefined,
        },
        signal,
      );
      if (signal?.aborted) return;
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      if (signal?.aborted) return;
      setError((err as ApiError)?.message ?? "Failed to load recent verifications.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [limit, statusFilter, periodFilter, customFrom, customTo]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, periodFilter, customFrom, customTo]);

  useEffect(() => {
    const controller = new AbortController();
    void load(page, controller.signal);
    return () => controller.abort();
  }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start      = total === 0 ? 0 : (page - 1) * limit + 1;
  const end        = Math.min(page * limit, total);
  const canPrev    = page > 1 && !loading;
  const canNext    = page < totalPages && !loading;

  return (
    <Card className="overflow-hidden gap-0 py-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Recent Verifications</h2>
          {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <a href="/results" className="text-xs font-semibold text-primary hover:underline">
          View all
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border">
        <div className="inline-flex items-center gap-1 rounded-full bg-muted/60 p-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex items-center gap-2" ref={customRef}>
          <div className="inline-flex items-center gap-1 rounded-full bg-muted/60 p-0.5">
            {PERIOD_FILTERS.map((f) => {
              const isActive = periodFilter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    if (f.value === "custom") {
                      setCustomOpen((v) => !v || periodFilter !== "custom");
                      if (periodFilter !== "custom") setPeriodFilter("custom");
                      return;
                    }
                    setCustomOpen(false);
                    setPeriodFilter((prev) => (prev === f.value ? "all" : f.value));
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.value === "custom" && <CalendarDays size={12} />}
                  {f.label}
                </button>
              );
            })}
          </div>

          {customOpen && (
            <div
              role="dialog"
              aria-label="Custom date range"
              className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-background p-4 shadow-lg"
            >
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-semibold">Custom range</p>
                <button
                  type="button"
                  onClick={() => setCustomOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3">
                {(() => {
                  const today = new Date().toISOString().slice(0, 10);
                  return (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">From</label>
                        <input
                          type="date"
                          value={customFrom}
                          max={customTo && customTo < today ? customTo : today}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">To</label>
                        <input
                          type="date"
                          value={customTo}
                          min={customFrom || undefined}
                          max={today}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                        />
                      </div>
                    </>
                  );
                })()}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFrom("");
                      setCustomTo("");
                      setPeriodFilter("all");
                      setCustomOpen(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!customFrom && !customTo}
                    onClick={() => setCustomOpen(false)}
                    className="h-7 px-3 text-xs"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-10 px-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email / File
              </TableHead>
              <TableHead className="h-10 w-24 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="h-10 w-32 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="h-10 w-40 px-5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Verified At
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : data.length === 0 && !loading ? (
              <EmptyState />
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  className="group border-b border-border/60 transition-colors hover:bg-muted/30"
                >
                  <TableCell className="py-3 px-5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        row.isBulk
                          ? "bg-blue-50 text-blue-600"
                          : "bg-slate-100 text-slate-600",
                      )}>
                        {row.isBulk
                          ? <FileSpreadsheet size={14} />
                          : <Mail size={14} />}
                      </div>
                      <span
                        className="truncate text-sm font-medium text-foreground"
                        title={row.label}
                      >
                        {row.label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3"><TypeCell isBulk={row.isBulk} /></TableCell>
                  <TableCell className="py-3"><StatusPill status={row.status} /></TableCell>
                  <TableCell className="py-3 px-5 text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatDateTime(row.verifiedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
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
    </Card>
  );
}
