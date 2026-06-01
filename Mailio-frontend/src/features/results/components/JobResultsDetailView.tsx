"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import { cn, formatNumber } from "@/src/lib/utils";
import type { ApiError } from "@/src/types/auth";
interface JobMeta {
  fileName: string;
  status:   "pending" | "processing" | "completed" | "failed";
  total:    number;
  valid:    number;
  invalid:  number;
  catchall: number;
}

const STATUS_PILL: Record<string, string> = {
  valid:    "bg-emerald-50 text-emerald-700 border-emerald-100",
  invalid:  "bg-red-50 text-red-600 border-red-100",
  catchall: "bg-amber-50 text-amber-700 border-amber-100",
  unknown:  "bg-slate-50 text-slate-600 border-slate-200",
};

const PAGE_SIZE = 10;

interface Props {
  jobId: string;
}

interface EmailRow {
  id:                 string;
  address:            string;
  verificationResult: "VALID" | "INVALID" | "CATCHALL" | "UNKNOWN" | null;
  score:              number | null;
  processedAt:        string | null;
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M10.5 1.5H4.5C4.10218 1.5 3.72064 1.65804 3.43934 1.93934C3.15804 2.22064 3 2.60218 3 3V15C3 15.3978 3.15804 15.7794 3.43934 16.0607C3.72064 16.342 4.10218 16.5 4.5 16.5H13.5C13.8978 16.5 14.2794 16.342 14.5607 16.0607C14.842 15.7794 15 15.3978 15 15V6L10.5 1.5Z" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.5 1.5V6H15" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M15 4.5L6.75 12.75L3 9" stroke="#14A055" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function WarningTriangleIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M5.5 4.125V5.95833" stroke={color} strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5 7.79175H5.50458" stroke={color} strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.72093 1.76923L0.834268 8.25007C0.754228 8.38868 0.711878 8.54583 0.711429 8.70589C0.710981 8.86595 0.752451 9.02333 0.831713 9.16239C0.910975 9.30145 1.02527 9.41733 1.16322 9.4985C1.30117 9.57967 1.45797 9.62331 1.61802 9.62507H9.38218C9.54223 9.62331 9.69903 9.57967 9.83698 9.4985C9.97493 9.41733 10.0892 9.30145 10.1685 9.16239C10.2478 9.02333 10.2892 8.86595 10.2888 8.70589C10.2883 8.54583 10.246 8.38868 10.1659 8.25007L6.27927 1.76923C6.19706 1.63658 6.08234 1.52711 5.94599 1.4512C5.80964 1.37529 5.65616 1.33545 5.5001 1.33545C5.34404 1.33545 5.19056 1.37529 5.05421 1.4512C4.91786 1.52711 4.80314 1.63658 4.72093 1.76923Z" stroke={color} strokeWidth="1.00833" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StatTile({
  label, value, icon, iconBg, loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-20 rounded-2xl" />;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#DCE6F3] bg-white p-3">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-tight truncate">{label}</p>
        <p className="mt-1 text-xl font-bold tabular-nums leading-tight text-[#111827]">
          {formatNumber(value)}
        </p>
      </div>
    </div>
  );
}

export function JobResultsDetailView({ jobId }: Props) {
  const [job,        setJob]        = useState<JobMeta | null>(null);
  const [rows,       setRows]       = useState<EmailRow[]>([]);
  const [rowsTotal,  setRowsTotal]  = useState(0);
  const [page,       setPage]       = useState(1);
  const [loadingMeta,    setLoadingMeta]    = useState(true);
  const [loadingRows,    setLoadingRows]    = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [downloading,    setDownloading]    = useState(false);

  const fetchMeta = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const m = await bulkVerifyService.getJobMeta(jobId, signal);
        if (signal?.aborted) return;
        setJob({
          fileName: m.originalFilename ?? m.name,
          status:   m.status.toLowerCase() as JobMeta["status"],
          total:    m.totalCount,
          valid:    m.validCount,
          invalid:  m.invalidCount,
          catchall: m.catchallCount + m.unknownCount,
        });
      } catch (err) {
        if (signal?.aborted) return;
        const apiErr = err as ApiError;
        setError(apiErr?.message ?? "Failed to load job.");
      } finally {
        if (!signal?.aborted) setLoadingMeta(false);
      }
    },
    [jobId],
  );

  const fetchRows = useCallback(
    async (p: number, signal?: AbortSignal) => {
      setLoadingRows(true);
      try {
        const res = await bulkVerifyService.getEmailsPage(jobId, p, PAGE_SIZE, undefined, signal);
        if (signal?.aborted) return;
        setRows(res.items);
        setRowsTotal(res.total);
      } catch (err) {
        if (signal?.aborted) return;
        const apiErr = err as ApiError;
        toast.error(apiErr?.message ?? "Failed to load emails.");
      } finally {
        if (!signal?.aborted) setLoadingRows(false);
      }
    },
    [jobId],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      setLoadingMeta(true);
      setError(null);
      void fetchMeta(controller.signal);
    });
    return () => controller.abort();
  }, [fetchMeta]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void fetchRows(page, controller.signal));
    return () => controller.abort();
  }, [fetchRows, page]);

  const totalPages = Math.max(1, Math.ceil(rowsTotal / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const start      = rowsTotal === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end        = Math.min(safePage * PAGE_SIZE, rowsTotal);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchMeta(), fetchRows(page)]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await bulkVerifyService.download(jobId, "csv", "full");
      toast.success("Download started.");
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const handleRetry = async () => {
    try {
      const { requeuedCount } = await bulkVerifyService.retry(jobId);
      toast.success(`${requeuedCount} email${requeuedCount === 1 ? "" : "s"} re-queued.`);
      await fetchRows(page);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Retry failed.");
    }
  };

  const counts = job
    ? { total: job.total, valid: job.valid, invalid: job.invalid, catchall: job.catchall }
    : { total: 0, valid: 0, invalid: 0, catchall: 0 };

  return (
    <div className="space-y-4">
      <PageHeader
        title={job?.fileName ?? "Job results"}
        subtitle={
          job ? `Verification results · ${job.status}` : "Verification results"
        }
        onRefresh={handleRefresh}
        refreshing={refreshing || loadingMeta}
        backHref="/bulk-verify"
        backLabel="Back to Bulk Verify"
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Total Emails"
          value={counts.total}
          icon={<FileIcon />}
          iconBg="bg-[#E6EEFB]"
          loading={loadingMeta}
        />
        <StatTile
          label="Valid"
          value={counts.valid}
          icon={<CheckIcon />}
          iconBg="bg-[#E2F4EA]"
          loading={loadingMeta}
        />
        <StatTile
          label="Invalid"
          value={counts.invalid}
          icon={<WarningTriangleIcon color="#E03A3A" />}
          iconBg="bg-[#FCE6E6]"
          loading={loadingMeta}
        />
        <StatTile
          label="Catchall"
          value={counts.catchall}
          icon={<WarningTriangleIcon color="#E89B1A" />}
          iconBg="bg-[#FDEFD3]"
          loading={loadingMeta}
        />
      </div>

      <Card>
        <CardContent className="pt-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#111827]">Emails</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {rowsTotal === 0
                  ? "No records yet"
                  : `${formatNumber(rowsTotal)} verified emails`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {job?.status === "failed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="h-8 gap-1.5 rounded-full border-[#DCE6F3] bg-white px-3 text-xs font-medium"
                >
                  <RotateCcw size={13} /> Retry
                </Button>
              )}
              <Button
                size="sm"
                disabled={downloading || rowsTotal === 0}
                onClick={handleDownload}
                className="h-8 gap-1.5 rounded-full bg-[#0F5BFF] px-4 text-xs font-semibold text-white hover:bg-[#0a48cc] disabled:opacity-50"
              >
                {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Download CSV
              </Button>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {["Email", "Status", "Score", "Processed At"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center">
                      <Loader2 size={16} className="inline animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No emails on this page.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const statusKey = (r.verificationResult ?? "UNKNOWN").toLowerCase();
                    return (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-3 py-2 font-medium truncate max-w-[280px]">{r.address}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
                              STATUS_PILL[statusKey] ?? STATUS_PILL.unknown,
                            )}
                          >
                            {statusKey}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {r.score ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">
                          {r.processedAt
                            ? new Date(r.processedAt).toLocaleString(undefined, {
                                month: "short",
                                day:   "numeric",
                                hour:  "numeric",
                                minute:"2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground tabular-nums">
              {rowsTotal === 0 ? (
                "No records"
              ) : (
                <>
                  Showing <span className="font-semibold text-foreground">{start}</span>–
                  <span className="font-semibold text-foreground">{end}</span> of{" "}
                  <span className="font-semibold text-foreground">{formatNumber(rowsTotal)}</span>
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1 || loadingRows}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 gap-1.5 rounded-full border-[#DCE6F3] bg-white px-3 text-xs font-medium text-[#161514] hover:bg-[#F4F8FF] disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft size={13} /> Prev
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums px-1">
                Page <span className="font-semibold text-foreground">{safePage}</span> / {totalPages}
              </span>
              <Button
                size="sm"
                disabled={safePage >= totalPages || loadingRows}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 gap-1.5 rounded-full bg-[#111827] px-4 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
                aria-label="Next page"
              >
                Next <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
