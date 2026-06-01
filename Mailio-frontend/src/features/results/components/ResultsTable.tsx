"use client";

import { useState } from "react";
import { Download, Eye, FileText, Loader2, Mail } from "lucide-react";
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
  valid:   { label: "Valid",   textColor: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-100", dotColor: "bg-emerald-500" },
  invalid: { label: "Invalid", textColor: "text-red-600",     bgColor: "bg-red-50 border-red-100",         dotColor: "bg-red-500"     },
  catchall:   { label: "Catchall",   textColor: "text-amber-700",   bgColor: "bg-amber-50 border-amber-100",     dotColor: "bg-amber-400"   },
};

const PAGE_SIZES = [10, 25, 50] as const;

interface Props {
  records:   ResultRecord[];
  filters:   ResultsFilters;
  total:     number;
  loading:   boolean;
  onChange:  (patch: Partial<ResultsFilters>) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Download failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {["Email / File", "Type", "Status", "Catchall", "Verified At", "View", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td colSpan={7} className="px-3 py-2.5"><Skeleton className="h-5 w-full" /></td>
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No results match your filters.
                </td>
              </tr>
            ) : (
              records.map((row, i) => {
                const cfg = STATUS_CONFIG[row.status];
                const isBulk = row.type === "bulk";
                const canAct = isBulk && !!row.bulkJob && row.bulkJob.status === "completed";
                return (
                  <tr
                    key={row.id}
                    className={cn("border-b border-border last:border-0 transition-colors hover:bg-muted/20", i % 2 === 1 && "bg-muted/10")}
                  >
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        {isBulk
                          ? <FileText size={13} className="shrink-0 text-muted-foreground" />
                          : <Mail size={13} className="shrink-0 text-muted-foreground" />}
                        <span className="font-medium truncate max-w-52">{row.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        isBulk ? "bg-fuchsia-50 text-fuchsia-700" : "bg-blue-50 text-blue-700",
                      )}>
                        {isBulk ? "Bulk" : "Single"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.bgColor, cfg.textColor)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {row.catchall === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className={cn(
                          "text-xs font-medium",
                          row.catchall === "low"    && "text-emerald-600",
                          row.catchall === "medium" && "text-amber-600",
                          row.catchall === "high"   && "text-red-600",
                        )}>
                          {row.catchall.charAt(0).toUpperCase() + row.catchall.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(row.verifiedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      {canAct ? (
                        <button
                          type="button"
                          onClick={() => setViewingJob(row.bulkJob ?? null)}
                          aria-label={`View details for ${row.label}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground px-2">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {canAct ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleDownload(row)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          {busyId === row.id
                            ? <><Loader2 size={12} className="animate-spin" /> Downloading…</>
                            : <><Download size={12} /> Download</>}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground px-2">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows per page:</span>
          <div className="flex gap-1">
            {PAGE_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => onChange({ pageSize: size, page: 1 })}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                  filters.pageSize === size ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {total === 0 ? "0" : `${(filters.page - 1) * filters.pageSize + 1}–${Math.min(filters.page * filters.pageSize, total)}`} of {total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={filters.page <= 1}
              onClick={() => onChange({ page: filters.page - 1 })}
            >
              ← Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={filters.page >= totalPages}
              onClick={() => onChange({ page: filters.page + 1 })}
            >
              Next →
            </Button>
          </div>
        </div>
      </div>

      <JobDetailsDialog
        job={viewingJob}
        onOpenChange={(open) => { if (!open) setViewingJob(null); }}
      />
    </div>
  );
}
