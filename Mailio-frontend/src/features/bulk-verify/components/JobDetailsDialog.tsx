"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import { cn } from "@/src/lib/utils";
import type { ApiError } from "@/src/types/auth";
import type { BulkJobDto } from "@/src/types/bulk";

interface ResultRow {
  email:  string;
  user:   string;
  domain: string;
  status: string;
}

const STATUS_PILL: Record<string, string> = {
  valid:   "bg-emerald-50 text-emerald-700 border-emerald-100",
  invalid: "bg-red-50 text-red-600 border-red-100",
  catchall:   "bg-amber-50 text-amber-700 border-amber-100",
  unknown: "bg-slate-50 text-slate-600 border-slate-200",
};

const PAGE_SIZE = 10;

interface Props {
  job:          BulkJobDto | null;
  onOpenChange: (open: boolean) => void;
}

export function JobDetailsDialog({ job, onOpenChange }: Props) {
  const [rows,    setRows]    = useState<ResultRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [page,    setPage]    = useState(1);

  useEffect(() => {
    if (!job) {
      setRows(null);
      setError(null);
      setPage(1);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPage(1);
    bulkVerifyService
      .getResultRows(job.jobId, controller.signal)
      .then((res) => { if (!controller.signal.aborted) setRows(res); })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const apiErr = err as ApiError;
        setError(apiErr?.message ?? "Failed to load results.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [job]);

  const total      = rows?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const start      = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end        = Math.min(safePage * PAGE_SIZE, total);

  const pageRows = useMemo(
    () => rows ? rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : [],
    [rows, safePage],
  );

  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] flex-col gap-3 p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="truncate pr-6 text-sm sm:text-base">
            {job?.fileName ?? "Job details"}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr>
                {["Email", "User", "Domain", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center">
                    <Loader2 size={16} className="inline animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-destructive">{error}</td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No completed rows yet.
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => (
                  <tr key={`${r.email}-${i}`} className="border-t border-border">
                    <td className="px-3 py-2 font-medium truncate max-w-[200px]">{r.email}</td>
                    <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{r.user || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{r.domain || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
                        STATUS_PILL[r.status] ?? STATUS_PILL.unknown,
                      )}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground tabular-nums">
            {total === 0
              ? "No records"
              : <>Showing <span className="font-semibold text-foreground">{start}</span>–<span className="font-semibold text-foreground">{end}</span> of <span className="font-semibold text-foreground">{total}</span></>
            }
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 gap-1.5 rounded-full border-[#DCE6F3] bg-white px-3 text-xs font-medium text-[#161514] hover:bg-[#F4F8FF] disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft size={13} /> Prev
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums px-1">
              Page <span className="font-semibold text-foreground">{safePage}</span> / {totalPages}
            </span>
            <Button
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 gap-1.5 rounded-full bg-[#111827] px-4 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
              aria-label="Next page"
            >
              Next <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
