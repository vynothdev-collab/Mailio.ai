"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Eye, FileText, RotateCcw, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/src/components/ConfirmDeleteDialog";
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
  const [pendingDelete, setPendingDelete] = useState<BulkJobDto | null>(null);
  const [deleting,      setDeleting]      = useState(false);
  const [openMenuId,    setOpenMenuId]    = useState<string | null>(null);
  const [menuPos,       setMenuPos]       = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const MENU_WIDTH = 176;
  const MENU_HEIGHT_ESTIMATE = 140;

  const positionMenu = (jobId: string) => {
    const btn = triggerRefs.current[jobId];
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const placement: "top" | "bottom" = spaceBelow < MENU_HEIGHT_ESTIMATE + 16 ? "top" : "bottom";
    const top = placement === "bottom" ? r.bottom + 4 : r.top - 4;
    const left = Math.min(window.innerWidth - MENU_WIDTH - 8, r.right - MENU_WIDTH);
    setMenuPos({ top, left: Math.max(8, left), placement });
  };

  useLayoutEffect(() => {
    if (!openMenuId) { setMenuPos(null); return; }
    positionMenu(openMenuId);
  }, [openMenuId]);

  useEffect(() => {
    if (!openMenuId) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRefs.current[openMenuId]?.contains(target)) return;
      setOpenMenuId(null);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuId(null);
    };
    const onReflow = () => positionMenu(openMenuId);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [openMenuId]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      await bulkVerifyService.deleteJob(target.jobId);
      toast.success("Bulk job deleted.");
      setPendingDelete(null);
      onChange();
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Failed to delete record.");
    } finally {
      setDeleting(false);
    }
  };

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
        <h2 className="text-base font-bold text-[#111827]">Recent Bulk Verifications</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[#DCE6F3]">
                {["File", "Total", "Status", "Valid", "Invalid", "Catchall", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#DCE6F3]/60 last:border-0">
                    <td colSpan={7} className="px-3 py-3"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No bulk jobs yet. Upload a file to get started.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
                  const isCompleted = job.status === "completed";
                  return (
                    <tr
                      key={job.jobId}
                      className="border-b border-[#DCE6F3]/60 last:border-0 transition-colors hover:bg-[#F4F8FF]/60"
                    >
                      <td className="px-3 py-3" title={job.fileName}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FB] text-[#8B847A]">
                            <FileText size={15} />
                          </div>
                          <span className="truncate max-w-[200px] text-sm font-medium text-[#111827]">
                            {job.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums font-semibold text-[#111827]">{formatNumber(job.totalEmails)}</td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.bgColor, cfg.textColor)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-bold tabular-nums text-emerald-600"><NumCell val={job.valid} /></td>
                      <td className="px-3 py-3 font-bold tabular-nums text-red-500"><NumCell val={job.invalid} /></td>
                      <td className="px-3 py-3 font-bold tabular-nums text-amber-500"><NumCell val={job.catchall} /></td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          ref={(el) => { triggerRefs.current[job.jobId] = el; }}
                          onClick={() => setOpenMenuId((id) => (id === job.jobId ? null : job.jobId))}
                          aria-label={`Actions for ${job.fileName}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === job.jobId}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[#EEF3FB] hover:text-[#111827] transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE6F3] pt-3">
          <p className="text-sm text-muted-foreground tabular-nums">
            {total === 0
              ? "No records"
              : <>Showing <span className="font-semibold text-[#111827]">{start}-{end}</span> of <span className="font-semibold text-[#111827]">{total}</span> jobs</>
            }
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canPrev}
              onClick={() => onPageChange(Math.max(1, page - 1))}
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
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className="h-8 gap-1.5 rounded-full bg-[#111827] px-4 text-xs font-semibold text-white hover:bg-[#000000] disabled:opacity-50"
              aria-label="Next page"
            >
              Next <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      </CardContent>

      {openMenuId && menuPos && typeof window !== "undefined" && (() => {
        const job = jobs.find((j) => j.jobId === openMenuId);
        if (!job) return null;
        const isCompleted = job.status === "completed";
        const style: React.CSSProperties = menuPos.placement === "bottom"
          ? { position: "fixed", top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }
          : { position: "fixed", top: menuPos.top, left: menuPos.left, width: MENU_WIDTH, transform: "translateY(-100%)" };
        return createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={style}
            className="z-50 overflow-hidden rounded-lg border border-[#DCE6F3] bg-white py-1 shadow-lg"
          >
            {isCompleted && (
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpenMenuId(null); setViewingJob(job); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[#161514] hover:bg-[#F4F8FF]"
              >
                <Eye size={13} /> View details
              </button>
            )}
            {isCompleted && (
              <button
                type="button"
                role="menuitem"
                disabled={downloadingId === job.jobId}
                onClick={() => { setOpenMenuId(null); void handleDownload(job); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[#161514] hover:bg-[#F4F8FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloadingId === job.jobId
                  ? <><Loader2 size={13} className="animate-spin" /> Downloading…</>
                  : <><Download size={13} /> Download</>}
              </button>
            )}
            {job.status === "failed" && (
              <button
                type="button"
                role="menuitem"
                disabled={retryingId === job.jobId}
                onClick={() => { setOpenMenuId(null); void handleRetry(job.jobId); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[#161514] hover:bg-[#F4F8FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retryingId === job.jobId
                  ? <><Loader2 size={13} className="animate-spin" /> Retrying…</>
                  : <><RotateCcw size={13} /> Retry</>}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpenMenuId(null); setPendingDelete(job); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>,
          document.body,
        );
      })()}

      <JobDetailsDialog
        job={viewingJob}
        onOpenChange={(open) => { if (!open) setViewingJob(null); }}
      />

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open && !deleting) setPendingDelete(null); }}
        title="Delete bulk job?"
        itemLabel={pendingDelete?.fileName}
        pending={deleting}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  );
}
