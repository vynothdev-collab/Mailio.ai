"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, FileText, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import { cn } from "@/src/lib/utils";
import type { ApiError } from "@/src/types/auth";
import type { BulkJobDto } from "@/src/types/bulk";
import type { ResultRecord, EmailStatus, ResultsFilters } from "../types";
import { JobDetailsDialog } from "@/src/features/bulk-verify/components/JobDetailsDialog";

const STATUS_CONFIG: Record<EmailStatus, { label: string; textColor: string; bgColor: string; dotColor: string }> = {
  valid:    { label: "Valid",    textColor: "text-emerald-700", bgColor: "bg-emerald-50 border border-emerald-100", dotColor: "bg-emerald-500" },
  invalid:  { label: "Invalid",  textColor: "text-red-600",     bgColor: "bg-red-50 border border-red-100",         dotColor: "bg-red-500"     },
  catchall: { label: "Catchall", textColor: "text-amber-700",   bgColor: "bg-amber-50 border border-amber-100",     dotColor: "bg-amber-400"   },
};

const PAGE_SIZES = [10, 25, 50] as const;

interface Props {
  records:  ResultRecord[];
  filters:  ResultsFilters;
  total:    number;
  loading:  boolean;
  onChange: (patch: Partial<ResultsFilters>) => void;
}

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

export function ResultsTable({ records, filters, total, loading, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const [busyId,     setBusyId]     = useState<string | null>(null);
  const [viewingJob, setViewingJob] = useState<BulkJobDto | null>(null);

  const handleDownload = async (row: ResultRecord) => {
    if (row.type !== "bulk" || !row.bulkJob) return;
    setBusyId(row.id);
    try {
      await bulkVerifyService.download(row.bulkJob.jobId, "csv", "full", row.bulkJob.fileName);
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Download failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-2 py-2 sm:px-3 text-left text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">Email / File</th>
              <th className="px-2 py-2 sm:px-3 text-left text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">Type</th>
              <th className="hidden sm:table-cell px-2 py-2 sm:px-3 text-left text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">Verified At</th>
              <th className="hidden sm:table-cell px-2 py-2 sm:px-3 text-left text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">View</th>
              <th className="px-2 py-2 sm:px-3 text-left text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 rounded" />
                      <Skeleton className="h-3.5 w-28 sm:h-4 sm:w-40" />
                    </div>
                  </td>
                  <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                    <Skeleton className="h-4 w-10 sm:w-14 rounded-md" />
                  </td>
                  <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-2.5">
                    <Skeleton className="h-3.5 w-24 sm:h-4 sm:w-32" />
                  </td>
                  <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-2.5">
                    <Skeleton className="h-5 w-14 sm:h-5 sm:w-16 rounded-full" />
                  </td>
                  <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                    <Skeleton className="h-5 w-14 sm:h-5 sm:w-20 rounded-md" />
                  </td>
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 sm:py-10 text-center text-xs sm:text-sm text-muted-foreground">
                  No results match your filters.
                </td>
              </tr>
            ) : (
              records.map((row, i) => {
                const isBulk = row.type === "bulk";
                const canAct = isBulk && !!row.bulkJob && row.bulkJob.status === "completed";
                return (
                  <tr
                    key={row.id}
                    className={cn("border-b border-border last:border-0 transition-colors hover:bg-muted/20", i % 2 === 1 && "bg-muted/10")}
                  >
                    {/* Email / File */}
                    <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        {isBulk
                          ? <FileText size={11} className="shrink-0 text-muted-foreground sm:hidden" />
                          : <Mail     size={11} className="shrink-0 text-muted-foreground sm:hidden" />}
                        {isBulk
                          ? <FileText size={13} className="shrink-0 text-muted-foreground hidden sm:block" />
                          : <Mail     size={13} className="shrink-0 text-muted-foreground hidden sm:block" />}
                        <span className="font-medium truncate max-w-[140px] sm:max-w-[240px] md:max-w-sm text-[11px] sm:text-sm">
                          {row.label}
                        </span>
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                      <span className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-xs font-medium",
                        isBulk ? "bg-fuchsia-50 text-fuchsia-700" : "bg-blue-50 text-blue-700",
                      )}>
                        {isBulk ? "Bulk" : "Single"}
                      </span>
                    </td>

                    {/* Verified At — hidden on mobile */}
                    <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-2.5 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      <span className="hidden md:inline">{formatDate(row.verifiedAt)}</span>
                      <span className="md:hidden">{formatDateShort(row.verifiedAt)}</span>
                    </td>

                    {/* View — status badge for single, eye icon for bulk */}
                    <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-2.5">
                      {!isBulk ? (
                        (() => {
                          const cfg = STATUS_CONFIG[row.status];
                          return (
                            <span className={cn(
                              "inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-1.5 py-0.5 sm:px-2 text-[10px] sm:text-xs font-semibold whitespace-nowrap",
                              cfg.bgColor, cfg.textColor,
                            )}>
                              <span className={cn("h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full shrink-0", cfg.dotColor)} />
                              {cfg.label}
                            </span>
                          );
                        })()
                      ) : canAct ? (
                        <button
                          type="button"
                          onClick={() => setViewingJob(row.bulkJob ?? null)}
                          aria-label={`View details for ${row.label}`}
                          className="inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Eye size={13} />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground px-1">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                      {canAct ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleDownload(row)}
                          className="inline-flex items-center gap-0.5 sm:gap-1 rounded-md px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs hover:bg-muted disabled:opacity-50"
                        >
                          {busyId === row.id
                            ? <><Loader2 size={10} className="animate-spin sm:hidden" /><Loader2 size={12} className="animate-spin hidden sm:block" /><span className="hidden sm:inline"> Downloading…</span></>
                            : <><Download size={10} className="sm:hidden" /><Download size={12} className="hidden sm:block" /> Download</>}
                        </button>
                      ) : (
                        <span className="text-[10px] sm:text-xs text-muted-foreground px-1">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2 border border-border rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 bg-white">
        {/* Left: Showing X–Y of Z jobs */}
        <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
          {total === 0 ? (
            "No jobs found"
          ) : (
            <>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(filters.page - 1) * filters.pageSize + 1}–{Math.min(filters.page * filters.pageSize, total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{total}</span> jobs
            </>
          )}
        </p>

        {/* Right: Prev  Page X / Y  Next */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 sm:h-8 gap-1 px-2 sm:px-3 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground"
            disabled={filters.page <= 1}
            onClick={() => onChange({ page: filters.page - 1 })}
          >
            <ChevronLeft size={13} />
            Prev
          </Button>

          <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums select-none">
            Page{" "}
            <span className="font-bold text-foreground">{filters.page}</span>
            {" / "}
            {totalPages}
          </span>

          <Button
            size="sm"
            className="h-7 sm:h-8 gap-1 px-2 sm:px-3 text-[10px] sm:text-xs bg-foreground text-background hover:bg-foreground/90"
            disabled={filters.page >= totalPages}
            onClick={() => onChange({ page: filters.page + 1 })}
          >
            Next
            <ChevronRight size={13} />
          </Button>
        </div>
      </div>

      <JobDetailsDialog
        job={viewingJob}
        onOpenChange={(open) => { if (!open) setViewingJob(null); }}
      />
    </div>
  );
}
