import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/src/components/shared/ProgressBar";
import { formatEta, formatNumber } from "@/src/lib/utils";
import { SUMMARY_CONFIG } from "../constants";
import type { ActiveVerification } from "../types";

interface ActiveVerificationCardProps {
  data: ActiveVerification;
}

export function ActiveVerificationCard({ data }: ActiveVerificationCardProps) {
  const { fileName, progress, processedCount, totalCount,
          etaSeconds, startedAt, valid, invalid, risky, disposable } = data;

  const summaryValues = { valid, invalid, risky, disposable };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Verification</CardTitle>
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Processing
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* File name */}
        <p className="text-sm font-medium truncate">{fileName}</p>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <ProgressBar value={progress} size="md" className="flex-1" />
          <span className="text-sm font-bold tabular-nums shrink-0">{progress}%</span>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Processed", value: `${formatNumber(processedCount)} / ${formatNumber(totalCount)}` },
            { label: "ETA",       value: formatEta(etaSeconds) },
            { label: "Started",   value: startedAt },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
              <p className="text-sm font-semibold tabular-nums truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-4 gap-2">
          {SUMMARY_CONFIG.map(({ key, label, textColor, bgColor }) => (
            <div key={key} className={`flex flex-col items-center rounded-xl ${bgColor} py-2.5 px-1`}>
              <span className={`text-base font-bold tabular-nums ${textColor}`}>
                {formatNumber(summaryValues[key])}
              </span>
              <span className={`text-[10px] font-medium ${textColor} opacity-80 mt-0.5`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
