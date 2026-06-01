import { Mail, MailOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/src/lib/utils";
import type { UsageBreakdownDto } from "@/src/types/usage";

interface Props {
  breakdown: UsageBreakdownDto | null;
  loading:   boolean;
}

export function UsageBreakdownTiles({ breakdown, loading }: Props) {
  if (loading || !breakdown) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const singleCount = breakdown.single ?? 0;
  const bulkJobs    = breakdown.bulk   ?? 0;
  const total       = singleCount + bulkJobs;

  const tiles = [
    {
      label:       "Single Verifications",
      count:       singleCount,
      sub:         `${formatNumber(singleCount)} email${singleCount !== 1 ? "s" : ""} verified`,
      pct:         total > 0 ? ((singleCount / total) * 100).toFixed(1) : "0",
      Icon:        Mail,
      iconColor:   "text-blue-600",
      iconBgColor: "bg-blue-50",
      barColor:    "bg-blue-500",
    },
    {
      label:       "Bulk Verifications",
      count:       bulkJobs,
      sub:         `${formatNumber(bulkJobs)} job${bulkJobs !== 1 ? "s" : ""} processed`,
      pct:         total > 0 ? ((bulkJobs / total) * 100).toFixed(1) : "0",
      Icon:        MailOpen,
      iconColor:   "text-fuchsia-600",
      iconBgColor: "bg-fuchsia-50",
      barColor:    "bg-fuchsia-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tiles.map(({ label, count, sub, pct, Icon, iconColor, iconBgColor, barColor }) => (
        <div key={label} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBgColor}`}>
            <Icon size={16} className={iconColor} />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            <p className="text-xl font-bold tabular-nums leading-tight">{formatNumber(count)}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">{pct}% of total this month</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
