import { FolderOpen, CheckCircle2, Database, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import type { BulkStatsDto } from "@/src/types/bulk";

interface Props {
  stats:   BulkStatsDto | null;
  loading: boolean;
}

interface Tile {
  label:    string;
  value:    string;
  subLabel: string;
  Icon:     React.ElementType;
  color:    string;
  bg:       string;
}

function buildTiles(s: BulkStatsDto): Tile[] {
  return [
    { label: "Files Verified Today", value: s.filesToday.toLocaleString(),    subLabel: s.changes.filesToday,    Icon: FolderOpen,   color: "text-blue-600",    bg: "bg-blue-50" },
    { label: "Completed Jobs",       value: s.completedJobs.toLocaleString(), subLabel: s.changes.completedJobs, Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "API Usage",            value: s.apiUsage.toLocaleString(),      subLabel: "Total emails",          Icon: Database,     color: "text-violet-600",  bg: "bg-violet-50" },
    { label: "Avg. Response Time",   value: s.avgResponseMs ? `${(s.avgResponseMs / 1000).toFixed(1)}s` : "—", subLabel: s.changes.avgResponseMs, Icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ];
}

export function BulkStatsRow({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const tiles = buildTiles(stats);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", t.bg)}>
            <t.Icon size={16} className={t.color} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground leading-tight truncate">{t.label}</p>
            <p className="text-lg font-bold tabular-nums leading-tight">{t.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.subLabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
