import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/src/components/shared/ProgressBar";
import { formatEta, formatNumber, cn } from "@/src/lib/utils";
import type { BulkActiveJobDto } from "@/src/types/bulk";

const SUMMARY = [
  { key: "valid"      as const, label: "Valid",      textColor: "text-emerald-600", bgColor: "bg-emerald-50" },
  { key: "invalid"    as const, label: "Invalid",    textColor: "text-red-500",     bgColor: "bg-red-50"     },
  { key: "risky"      as const, label: "Risky",      textColor: "text-amber-600",   bgColor: "bg-amber-50"   },
  { key: "disposable" as const, label: "Disposable", textColor: "text-violet-600",  bgColor: "bg-violet-50"  },
];

interface Props {
  job:     BulkActiveJobDto | null;
  loading: boolean;
}

export function BulkActiveVerificationCard({ job, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-2 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="pt-2 space-y-3">
          <h2 className="text-sm font-semibold">Active Verification</h2>
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <Inbox size={22} className="text-muted-foreground" />
            <p className="text-sm font-medium">No active job</p>
            <p className="text-xs text-muted-foreground">Upload a file to start a bulk verification.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = job.valid + job.invalid + job.risky + job.disposable;

  return (
    <Card>
      <CardContent className="pt-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Active Verification</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Processing
          </span>
        </div>

        <div>
          <p className="text-sm font-semibold truncate">{job.fileName}</p>
          {job.startedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Started {new Date(job.startedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ProgressBar value={job.progress} size="md" className="flex-1" />
          <span className="text-sm font-bold tabular-nums shrink-0">{job.progress}%</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] text-muted-foreground">Processed</p>
            <p className="text-xs font-semibold tabular-nums truncate">
              {formatNumber(job.processedCount)} / {formatNumber(job.totalCount)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">ETA</p>
            <p className="text-xs font-semibold tabular-nums truncate">
              {formatEta(job.etaSeconds)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {SUMMARY.map(({ key, label, textColor, bgColor }) => {
            const val = job[key];
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
            return (
              <div key={key} className={cn("flex flex-col items-center rounded-xl py-2.5 px-1", bgColor)}>
                <span className={cn("text-sm font-bold tabular-nums", textColor)}>{formatNumber(val)}</span>
                <span className={cn("text-[10px] font-medium opacity-80", textColor)}>{label}</span>
                <span className={cn("text-[10px] opacity-60", textColor)}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
