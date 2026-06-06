import { Mail, ShieldCheck, XCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import type { ResultsStats } from "@/src/services/resultsService";

interface Props {
  stats:   ResultsStats;
  loading: boolean;
}

export function ResultsStatsRow({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2 sm:gap-3 rounded-xl border border-border bg-card p-2.5 sm:p-3">
            <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
              <Skeleton className="h-2.5 w-14 sm:h-3 sm:w-16" />
              <Skeleton className="h-5 w-12 sm:h-6 sm:w-14" />
              <Skeleton className="h-2 w-16 sm:h-2.5 sm:w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { total, valid, invalid, catchall } = stats;
  const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—");

  const tiles = [
    { label: "Total Verified", value: total.toLocaleString(),    sub: `${total} record${total === 1 ? "" : "s"}`, Icon: Mail,          color: "text-blue-600",    bg: "bg-blue-50"    },
    { label: "Valid",          value: valid.toLocaleString(),    sub: pct(valid),                                  Icon: ShieldCheck,   color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Invalid",        value: invalid.toLocaleString(),  sub: pct(invalid),                                Icon: XCircle,       color: "text-red-500",     bg: "bg-red-50"     },
    { label: "Catchall",       value: catchall.toLocaleString(), sub: pct(catchall),                               Icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-50"   },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {tiles.map((s) => (
        <div key={s.label} className="flex items-start gap-2 sm:gap-3 rounded-xl border border-border bg-card p-2.5 sm:p-3">
          <div className={cn("flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg", s.bg)}>
            <s.Icon size={13} className={cn(s.color, "sm:hidden")} />
            <s.Icon size={16} className={cn(s.color, "hidden sm:block")} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight truncate">{s.label}</p>
            <p className="text-sm sm:text-lg font-bold tabular-nums leading-tight">{s.value}</p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
