"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/src/lib/utils";
import {
  verificationService,
  type SingleRecentItem,
} from "@/src/services/verificationService";
import type { ApiError } from "@/src/types/auth";
import { EMAIL_STATUS_CONFIG, RISK_CONFIG } from "../constants";
import type { EmailStatus, RecentVerification, RiskLevel } from "../types";

const STATUS_FALLBACK: EmailStatus = "unknown";
const RISK_FALLBACK:   RiskLevel   = "medium";
const PAGE_SIZE        = 10;

function StatusBadge({ status }: { status: EmailStatus }) {
  const cfg = EMAIL_STATUS_CONFIG[status] ?? EMAIL_STATUS_CONFIG[STATUS_FALLBACK];
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
      cfg.className,
    )}>
      {cfg.label}
    </span>
  );
}

function RiskCell({ risk }: { risk: RiskLevel }) {
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG[RISK_FALLBACK];
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.textColor)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fromApi(item: SingleRecentItem): RecentVerification {
  const status: EmailStatus =
    item.status === "valid" || item.status === "invalid" || item.status === "risky"
      ? item.status
      : "unknown";
  const risk: RiskLevel =
    item.risk === "low" || item.risk === "medium" || item.risk === "high"
      ? item.risk
      : "medium";
  return { id: item.id, email: item.email, status, risk, verifiedAt: item.verifiedAt };
}

interface Props {
  /** Bumped by parent on each successful verify so the table refetches. */
  refreshKey?: number;
  /** In-memory rows from VerificationContext, shown only on the first page. */
  optimistic?: RecentVerification[];
}

export function RecentSingleVerificationsTable({ refreshKey = 0, optimistic = [] }: Props) {
  const [page,    setPage]    = useState(1);
  const [rows,    setRows]    = useState<RecentVerification[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Reset to page 1 whenever the parent triggers a refresh (e.g. new verify).
  useEffect(() => { setPage(1); }, [refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    verificationService
      .getRecent(page, PAGE_SIZE, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setRows(res.data.map(fromApi));
        setTotal(res.total);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const apiErr = err as ApiError;
        setError(apiErr?.message ?? "Failed to load recent verifications.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, refreshKey]);

  // Optimistic rows from the in-memory context only make sense on page 1
  // (the latest verification belongs at the top of the list).
  const merged = useMemo(() => {
    if (page !== 1) return rows;
    const seen = new Set<string>();
    const result: RecentVerification[] = [];
    for (const r of [...optimistic, ...rows]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      result.push(r);
    }
    return result.slice(0, PAGE_SIZE);
  }, [optimistic, rows, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start      = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end        = Math.min(page * PAGE_SIZE, total);
  const canPrev    = page > 1 && !loading;
  const canNext    = page < totalPages && !loading;

  return (
    <Card className="overflow-hidden gap-0 py-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Recent Single Verifications</h2>
          {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <a href="/results" className="text-xs font-semibold text-primary hover:underline">View all</a>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Email</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-24">Risk</TableHead>
            <TableHead className="w-44">Verified At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && merged.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
              </TableRow>
            ))
          ) : error && merged.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-6 text-center text-sm text-destructive">{error}</TableCell>
            </TableRow>
          ) : merged.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                No verifications yet. Verify your first email above.
              </TableCell>
            </TableRow>
          ) : (
            merged.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">{r.email}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell><RiskCell risk={r.risk} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.verifiedAt)}</TableCell>
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
