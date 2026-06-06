"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eye, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/src/components/ConfirmDeleteDialog";
import { JobDetailsDialog } from "@/src/features/bulk-verify/components/JobDetailsDialog";
import { DonutChart } from "@/src/components/charts/DonutChart";
import { formatNumber, cn } from "@/src/lib/utils";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import type { BulkJobDto, BulkJobStatus } from "@/src/types/bulk";
import type { ApiError } from "@/src/types/auth";

interface Props {
  jobs: BulkJobDto[];
  loading: boolean;
  pendingUpload?: boolean;
  onDeleted?: () => void;
}

const STATUS_STYLES: Record<
  BulkJobStatus,
  { label: string; text: string; bg: string; dot: string; cardTint: string }
> = {
  processing: {
    label: "In progress",
    text: "text-blue-700",
    bg: "bg-blue-50 border border-blue-100",
    dot: "bg-blue-500 animate-pulse",
    cardTint:
      "border-2 border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_8px_22px_-8px_rgba(59,130,246,0.35)]",
  },
  pending: {
    label: "Queued",
    text: "text-blue-700",
    bg: "bg-blue-50 border border-blue-100",
    dot: "bg-blue-500 animate-pulse",
    cardTint:
      "border-2 border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_8px_22px_-8px_rgba(59,130,246,0.35)]",
  },
  completed: {
    label: "Completed",
    text: "text-emerald-700",
    bg: "bg-emerald-50 border border-emerald-100",
    dot: "bg-emerald-500",
    cardTint: "",
  },
  failed: {
    label: "Failed",
    text: "text-red-700",
    bg: "bg-red-50 border border-red-100",
    dot: "bg-red-500",
    cardTint: "",
  },
};

function StatusBadge({ status }: { status: BulkJobStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        s.bg,
        s.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function JobMenu({
  jobId,
  onView,
  onDeleted,
}: {
  jobId: string;
  onView: () => void;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const handleDownload = async () => {
    setOpen(false);
    setDownloading(true);
    try {
      await bulkVerifyService.download(jobId, "csv", "full");
      toast.success("Download started.");
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await bulkVerifyService.deleteJob(jobId);
      toast.success("Job deleted.");
      setConfirmOpen(false);
      onDeleted?.();
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Failed to delete job.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label="More options"
          onClick={() => setOpen((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#DCE6F3] bg-white text-muted-foreground hover:bg-[#F4F8FF] transition-colors"
        >
          {downloading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <MoreHorizontal size={14} />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-30 mt-1.5 w-40 rounded-xl border border-[#DCE6F3] bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onView();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#111827] hover:bg-[#F4F8FF] transition-colors"
            >
              <Eye size={14} className="text-muted-foreground" />
              View
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#111827] hover:bg-[#F4F8FF] transition-colors"
            >
              <Download size={14} className="text-muted-foreground" />
              Download
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          if (!v && !deleting) setConfirmOpen(false);
        }}
        title="Delete bulk job?"
        pending={deleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

function ResultCard({ job, onDeleted }: { job: BulkJobDto; onDeleted?: () => void }) {
  const valid = job.valid ?? 0;
  const invalid = job.invalid ?? 0;
  const catchall = job.catchall ?? 0;
  const total = valid + invalid + catchall;
  const isInFlight = job.status === "processing" || job.status === "pending";
  const tint = STATUS_STYLES[job.status]?.cardTint ?? "";
  const [viewingJob, setViewingJob] = useState<BulkJobDto | null>(null);

  return (
    <>
      <Card className={cn(tint)}>
        <CardContent className="pt-2 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-[#111827]" title={job.fileName}>
                {job.fileName}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={job.status} />
              </div>
            </div>
            {job.status === "completed" && (
              <JobMenu jobId={job.jobId} onView={() => setViewingJob(job)} onDeleted={onDeleted} />
            )}
          </div>

          {total === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {isInFlight ? "Verification in progress…" : "No verification data yet."}
            </p>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <DonutChart
                  data={[
                    {
                      name: "Valid",
                      value: valid,
                      percentage: `${((valid / total) * 100).toFixed(1)}%`,
                      color: "#22c55e",
                    },
                    {
                      name: "Invalid",
                      value: invalid,
                      percentage: `${((invalid / total) * 100).toFixed(1)}%`,
                      color: "#ef4444",
                    },
                    {
                      name: "Catchall",
                      value: catchall,
                      percentage: `${((catchall / total) * 100).toFixed(1)}%`,
                      color: "#f59e0b",
                    },
                  ]}
                  total={isInFlight ? (job.totalEmails ?? total) : total}
                />
              </div>

              <ul className="space-y-3" role="list">
                {[
                  { name: "Valid", value: valid, color: "#22c55e", pct: (valid / total) * 100 },
                  {
                    name: "Invalid",
                    value: invalid,
                    color: "#ef4444",
                    pct: (invalid / total) * 100,
                  },
                  {
                    name: "Catchall",
                    value: catchall,
                    color: "#f59e0b",
                    pct: (catchall / total) * 100,
                  },
                ].map((row) => (
                  <li key={row.name} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="text-sm font-medium text-[#111827]">{row.name}</span>
                      <div className="ml-2 flex-1 h-1.5 rounded-full bg-[#EEF3FB] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max(row.pct, 4)}%`, backgroundColor: row.color }}
                        />
                      </div>
                      <span className="w-12 text-right text-sm font-bold tabular-nums text-[#111827]">
                        {formatNumber(row.value)}
                      </span>
                      <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                        {row.pct.toFixed(1)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <a
                href={`/bulk-verify/results?jobId=${job.jobId}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F5BFF] hover:underline"
              >
                View results <span aria-hidden>→</span>
              </a>
            </>
          )}
        </CardContent>
      </Card>

      <JobDetailsDialog
        job={viewingJob}
        onOpenChange={(open) => {
          if (!open) setViewingJob(null);
        }}
      />
    </>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-2 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentBulkFilesCard({ jobs, loading, pendingUpload, onDeleted }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const items = jobs.slice(0, pendingUpload ? 2 : 3);

  if (items.length === 0 && !pendingUpload) {
    return (
      <Card>
        <CardContent className="pt-2 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#111827]">Results Overview</h2>
              <p className="mt-1 text-xs text-muted-foreground">Last 3 verifications</p>
            </div>
          </div>
          <p className="py-6 text-center text-xs text-muted-foreground">
            No verification data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingUpload && <SkeletonCard />}
      {items.map((job) => (
        <ResultCard key={job.jobId} job={job} onDeleted={onDeleted} />
      ))}
    </div>
  );
}
