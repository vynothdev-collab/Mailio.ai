"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import { formatNumber, cn } from "@/src/lib/utils";
import type { ApiError } from "@/src/types/auth";
import type { BulkJobDto, BulkJobStatus } from "@/src/types/bulk";
import { JobDetailsDialog } from "./JobDetailsDialog";

const STATUS_CONFIG: Record<BulkJobStatus, { label: string; textColor: string; bgColor: string; dotColor: string }> = {
  completed:  { label: "Completed",  textColor: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-100", dotColor: "bg-emerald-500" },
  processing: { label: "Processing", textColor: "text-blue-700",    bgColor: "bg-blue-50 border-blue-100",       dotColor: "bg-blue-500 animate-pulse" },
  failed:     { label: "Failed",     textColor: "text-red-700",     bgColor: "bg-red-50 border-red-100",         dotColor: "bg-red-500" },
  pending:    { label: "Queued",     textColor: "text-amber-700",   bgColor: "bg-amber-50 border-amber-100",     dotColor: "bg-amber-500" },
};

function NumCell({ val }: { val: number | null | undefined }) {
  if (val === null || val === undefined) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{formatNumber(val)}</span>;
}

interface Props {
  jobs:         BulkJobDto[];
  total:        number;
  page:         number;
  pageSize:     number;
  loading:      boolean;
  onPageChange: (page: number) => void;
  onChange:     () => void;
}

export function RecentBulkVerificationsTable({
  jobs, total, page, pageSize, loading, onPageChange, onChange,
}: Props) {
  const [retryingId,    setRetryingId]    = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingJob,    setViewingJob]    = useState<BulkJobDto | null>(null);

  const handleDownload = async (job: BulkJobDto) => {
    setDownloadingId(job.jobId);
    try {
      await bulkVerifyService.download(job.jobId, "csv", "full", job.fileName);
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start      = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end        = Math.min(page * pageSize, total);
  const canPrev    = page > 1 && !loading;
  const canNext    = page < totalPages && !loading;

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      const { requeuedCount } = await bulkVerifyService.retry(jobId);
      toast.success(`Re-queued ${requeuedCount} email${requeuedCount === 1 ? "" : "s"}`);
      onChange();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Retry failed.");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <Card>
      <CardContent className="pt-2 space-y-3">
        <h2 className="text-sm font-semibold">Recent Bulk Verifications</h2>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["File", "Total", "Status", "Valid", "Invalid", "Risky", "View", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={8} className="px-3 py-2.5"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No bulk jobs yet. Upload a file to get started.
                  </td>
                </tr>
              ) : (
                jobs.map((job, i) => {
                  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
                  const isCompleted = job.status === "completed";
                  return (
                    <tr
                      key={job.jobId}
                      className={cn("border-b border-border last:border-0 transition-colors hover:bg-muted/20", i % 2 === 1 && "bg-muted/10")}
                    >
                      <td className="px-3 py-2.5 font-medium max-w-44 truncate">{job.fileName}</td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{formatNumber(job.totalEmails)}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.bgColor, cfg.textColor)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-emerald-600 font-semibold"><NumCell val={job.valid} /></td>
                      <td className="px-3 py-2.5 text-red-500 font-semibold"><NumCell val={job.invalid} /></td>
                      <td className="px-3 py-2.5 text-amber-600 font-semibold"><NumCell val={job.risky} /></td>
                      <td className="px-3 py-2.5">
                        {job.status === "completed" ? (
                          <button
                            onClick={() => setViewingJob(job)}
                            aria-label={`View details for ${job.fileName}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground px-2">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {job.status === "failed" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs px-2"
                            disabled={retryingId === job.jobId}
                            onClick={() => handleRetry(job.jobId)}
                          >
                            {retryingId === job.jobId
                              ? <Loader2 size={12} className="animate-spin" />
                              : <RotateCcw size={12} />}
                            Retry
                          </Button>
                        ) : isCompleted ? (
                          <button
                            type="button"
                            disabled={downloadingId === job.jobId}
                            onClick={() => handleDownload(job)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {downloadingId === job.jobId
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

        {/* Pagination footer */}
        <div className="flex items-center justify-between gap-3 pt-1">
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
              onClick={() => onPageChange(Math.max(1, page - 1))}
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
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className="gap-1 h-7 px-2 text-xs"
              aria-label="Next page"
            >
              Next <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      </CardContent>

      <JobDetailsDialog
        job={viewingJob}
        onOpenChange={(open) => { if (!open) setViewingJob(null); }}
      />
    </Card>
  );
}
