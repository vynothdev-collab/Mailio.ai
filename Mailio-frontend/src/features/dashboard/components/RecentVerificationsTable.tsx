"use client";

// Recent verifications table — backed by GET /dashboard/recent-verifications.
// Self-fetches with internal pagination so the parent dashboard view doesn't
// need to thread page state through props.

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileX, Loader2 } from "lucide-react";
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
  RecentVerificationRisk,
  RecentVerificationStatus,
} from "@/src/types/dashboard";
import type { ApiError } from "@/src/types/auth";

// ── Status / risk styling ──────────────────────────────────────────────────

const STATUS_STYLE: Record<RecentVerificationStatus, { label: string; className: string; dot: string }> = {
  valid:      { label: "Valid",      className: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  invalid:    { label: "Invalid",    className: "bg-red-50 text-red-600 border-red-100",             dot: "bg-red-500"     },
  risky:      { label: "Risky",      className: "bg-amber-50 text-amber-700 border-amber-100",       dot: "bg-amber-400"   },
  unknown:    { label: "Unknown",    className: "bg-slate-50 text-slate-600 border-slate-200",       dot: "bg-slate-400"   },
  disposable: { label: "Disposable", className: "bg-violet-50 text-violet-700 border-violet-100",    dot: "bg-violet-500"  },
};

const RISK_STYLE: Record<RecentVerificationRisk, { label: string; textColor: string; dotColor: string }> = {
  low:     { label: "Low",     textColor: "text-emerald-600",  dotColor: "bg-emerald-500"  },
  medium:  { label: "Medium",  textColor: "text-amber-600",    dotColor: "bg-amber-400"    },
  high:    { label: "High",    textColor: "text-red-600",      dotColor: "bg-red-500"      },
  unknown: { label: "Unknown", textColor: "text-muted-foreground", dotColor: "bg-slate-400" },
};

function StatusPill({ status }: { status: RecentVerificationStatus }) {
  const cfg = STATUS_STYLE[status] ?? STATUS_STYLE.unknown;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function RiskCell({ risk }: { risk: RecentVerificationRisk }) {
  const cfg = RISK_STYLE[risk] ?? RISK_STYLE.unknown;
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.textColor)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
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

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={5} className="py-12 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <FileX size={32} strokeWidth={1.5} />
          <p className="text-sm font-medium">No verifications yet</p>
          <p className="text-xs">Verify your first email to see it here.</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 10;

interface RecentVerificationsTableProps {
  /** Override page size if needed; defaults to 10. */
  limit?: number;
}

export function RecentVerificationsTable({ limit = DEFAULT_LIMIT }: RecentVerificationsTableProps = {}) {
  const [page,    setPage]    = useState(1);
  const [data,    setData]    = useState<RecentVerificationItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (targetPage: number, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getRecentVerifications(targetPage, limit, signal);
      if (signal?.aborted) return;
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      if (signal?.aborted) return;
      setError((err as ApiError)?.message ?? "Failed to load recent verifications.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [limit]);

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
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Recent Verifications</h2>
          {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <a href="/results" className="text-xs font-semibold text-primary hover:underline">
          View all
        </a>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Email</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-28">Risk</TableHead>
            <TableHead className="w-44">Verified At</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {error ? (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-sm text-destructive">
                {error}
              </TableCell>
            </TableRow>
          ) : data.length === 0 && !loading ? (
            <EmptyState />
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-sm truncate max-w-[260px]">{row.email}</TableCell>
                <TableCell><TypeCell isBulk={row.isBulk} /></TableCell>
                <TableCell><StatusPill status={row.status} /></TableCell>
                <TableCell><RiskCell risk={row.risk} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(row.verifiedAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination footer */}
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
