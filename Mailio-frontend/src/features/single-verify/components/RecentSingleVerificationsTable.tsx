"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/src/components/ConfirmDeleteDialog";
import { useVerificationHistory } from "@/src/context/VerificationContext";
import { cn } from "@/src/lib/utils";
import {
  verificationService,
  type SingleRecentItem,
} from "@/src/services/verificationService";
import type { ApiError } from "@/src/types/auth";
import { EMAIL_STATUS_CONFIG, CATCHALL_CONFIG } from "../constants";
import type { EmailStatus, RecentVerification, CatchallLevel } from "../types";

const STATUS_FALLBACK: EmailStatus = "unknown";
const CATCHALL_FALLBACK: CatchallLevel = "medium";
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

function CatchallCell({ catchall }: { catchall: CatchallLevel }) {
  const cfg = CATCHALL_CONFIG[catchall] ?? CATCHALL_CONFIG[CATCHALL_FALLBACK];
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
    item.status === "valid" || item.status === "invalid" || item.status === "catchall"
      ? item.status
      : "unknown";
  const catchall: CatchallLevel =
    item.catchall === "low" || item.catchall === "medium" || item.catchall === "high"
      ? item.catchall
      : "medium";
  return { id: item.id, email: item.email, status, catchall, verifiedAt: item.verifiedAt };
}

interface Props {
  refreshKey?: number;
  optimistic?: RecentVerification[];
  onDeleted?:  () => void;
}

export function RecentSingleVerificationsTable({ refreshKey = 0, optimistic = [], onDeleted }: Props) {
  const [page,    setPage]    = useState(1);
  const [rows,    setRows]    = useState<RecentVerification[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const { remove: removeFromHistory } = useVerificationHistory();
  const [pendingDelete, setPendingDelete] = useState<RecentVerification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      await verificationService.deleteOne(target.id);
      removeFromHistory(target.id);
      toast.success("Verification deleted.");
      setPendingDelete(null);
      onDeleted?.();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Failed to delete record.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => { setPage(1); }, [refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#111827]">Recent Single Verifications</h2>
          {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <a
          href="/results"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F5BFF] hover:underline"
        >
          View all <span aria-hidden>→</span>
        </a>
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full min-w-[640px]">
          <TableHeader>
            <TableRow className="border-b border-[#DCE6F3] hover:bg-transparent">
              <TableHead className="h-10 px-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </TableHead>
              <TableHead className="h-10 w-32 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="h-10 w-28 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Catchall
              </TableHead>
              <TableHead className="h-10 w-40 px-5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Verified At
              </TableHead>
              <TableHead className="h-10 w-20 pr-5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && merged.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5} className="px-5"><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : error && merged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-destructive">{error}</TableCell>
              </TableRow>
            ) : merged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No verifications yet. Verify your first email above.
                </TableCell>
              </TableRow>
            ) : (
              merged.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-b border-[#DCE6F3]/60 last:border-0 transition-colors hover:bg-[#F4F8FF]/60"
                >
                  <TableCell className="px-5 py-3 text-sm font-medium text-[#111827]">{r.email}</TableCell>
                  <TableCell className="py-3"><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="py-3"><CatchallCell catchall={r.catchall} /></TableCell>
                  <TableCell className="px-5 py-3 text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatDate(r.verifiedAt)}
                  </TableCell>
                  <TableCell className="pr-5 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPendingDelete(r)}
                      aria-label={`Delete verification for ${r.email}`}
                      className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open && !deleting) setPendingDelete(null); }}
        title="Delete verification?"
        itemLabel={pendingDelete?.email}
        pending={deleting}
        onConfirm={handleConfirmDelete}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE6F3] px-5 py-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          {total === 0
            ? "No records"
            : <>Showing <span className="font-semibold text-[#111827]">{start}-{end}</span> of <span className="font-semibold text-[#111827]">{total}</span></>
          }
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 gap-1.5 rounded-full border-[#DCE6F3] bg-white px-3 text-xs font-medium text-[#161514] hover:bg-[#F4F8FF] disabled:opacity-50"
            aria-label="Previous page"
          >
            <ChevronLeft size={13} /> Prev
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums px-1">
            Page <span className="font-semibold text-[#111827]">{page}</span> / {totalPages}
          </span>
          <Button
            size="sm"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 gap-1.5 rounded-full bg-[#111827] px-4 text-xs font-semibold text-white hover:bg-[#000000] disabled:opacity-50"
            aria-label="Next page"
          >
            Next <ChevronRight size={13} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
