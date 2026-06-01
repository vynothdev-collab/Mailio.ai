"use client";

import { MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart } from "@/src/components/charts/DonutChart";
import { formatNumber, cn } from "@/src/lib/utils";
import type { BulkJobDto, BulkJobStatus } from "@/src/types/bulk";

interface Props {
  jobs:           BulkJobDto[];
  loading:        boolean;
  pendingUpload?: boolean;
}

const STATUS_STYLES: Record<
  BulkJobStatus,
  { label: string; text: string; bg: string; dot: string; cardTint: string }
> = {
  processing: {
    label:    "In progress",
    text:     "text-blue-700",
    bg:       "bg-blue-50 border border-blue-100",
    dot:      "bg-blue-500 animate-pulse",
    cardTint: "border-2 border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_8px_22px_-8px_rgba(59,130,246,0.35)]",
  },
  pending: {
    label:    "Queued",
    text:     "text-blue-700",
    bg:       "bg-blue-50 border border-blue-100",
    dot:      "bg-blue-500 animate-pulse",
    cardTint: "border-2 border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_8px_22px_-8px_rgba(59,130,246,0.35)]",
  },
  completed: {
    label:    "Completed",
    text:     "text-emerald-700",
    bg:       "bg-emerald-50 border border-emerald-100",
    dot:      "bg-emerald-500",
    cardTint: "",
  },
  failed: {
    label:    "Failed",
    text:     "text-red-700",
    bg:       "bg-red-50 border border-red-100",
    dot:      "bg-red-500",
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
        s.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function Header({
  title,
  subtitle,
  status,
}: {
  title:    string;
  subtitle: string;
  status:   BulkJobStatus;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-[#111827]" title={title}>
          {title}
        </h2>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={status} />
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        aria-label="More options"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#DCE6F3] bg-white text-muted-foreground hover:bg-[#F4F8FF] transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>
    </div>
  );
}

function ResultCard({ job }: { job: BulkJobDto }) {
  const valid    = job.valid    ?? 0;
  const invalid  = job.invalid  ?? 0;
  const catchall = job.catchall ?? 0;
  const total    = valid + invalid + catchall;
  const isInFlight = job.status === "processing" || job.status === "pending";
  const tint = STATUS_STYLES[job.status]?.cardTint ?? "";

  const subtitle = "";

  if (total === 0) {
    return (
      <Card className={cn(tint)}>
        <CardContent className="pt-2 space-y-4">
          <Header title={job.fileName} subtitle={subtitle} status={job.status} />
          <p className="py-6 text-center text-xs text-muted-foreground">
            {isInFlight ? "Verification in progress…" : "No verification data yet."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const breakdown = [
    { name: "Valid",    value: valid,    color: "#22c55e" },
    { name: "Invalid",  value: invalid,  color: "#ef4444" },
    { name: "Catchall", value: catchall, color: "#f59e0b" },
  ];

  const chartData = breakdown.map((d) => ({
    name:       d.name,
    value:      d.value,
    percentage: `${((d.value / total) * 100).toFixed(1)}%`,
    color:      d.color,
  }));

  return (
    <Card className={cn(tint)}>
      <CardContent className="pt-2 space-y-5">
        <Header title={job.fileName} subtitle={subtitle} status={job.status} />

        <div className="flex flex-col items-center">
          <DonutChart
            data={chartData}
            total={isInFlight ? (job.totalEmails ?? total) : total}
          />
        </div>

        <ul className="space-y-3" role="list">
          {chartData.map((row) => {
            const pct = (row.value / total) * 100;
            return (
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
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-bold tabular-nums text-[#111827]">
                    {formatNumber(row.value)}
                  </span>
                  <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                    {row.percentage}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <a
          href={`/bulk-verify?jobId=${job.jobId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F5BFF] hover:underline"
        >
          View results <span aria-hidden>→</span>
        </a>
      </CardContent>
    </Card>
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

export function RecentBulkFilesCard({ jobs, loading, pendingUpload }: Props) {
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
        <ResultCard key={job.jobId} job={job} />
      ))}
    </div>
  );
}
