import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import type { BulkStatsDto } from "@/src/types/bulk";

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

function TrendingUpVioletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.25 12.75L6.75 8.25L9.75 11.25L15.75 5.25" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.5 5.25H15.75V10.5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

interface Props {
  stats:   BulkStatsDto | null;
  loading: boolean;
}

interface Tile {
  id:     string;
  label:  string;
  value:  string;
  icon:   React.ReactNode;
  iconBg: string;
}

function buildTiles(s: BulkStatsDto): Tile[] {
  return [
    {
      id:     "files-today",
      label:  "Files Verified Today",
      value:  s.filesToday.toLocaleString(),
      icon:   <FileIcon />,
      iconBg: "bg-[#E6EEFB]",
    },
    {
      id:     "completed",
      label:  "Completed Jobs",
      value:  s.completedJobs.toLocaleString(),
      icon:   <CheckIcon />,
      iconBg: "bg-[#E2F4EA]",
    },
    {
      id:     "success",
      label:  "Success Count",
      value:  (s.successCount ?? 0).toLocaleString(),
      icon:   <TrendingUpVioletIcon />,
      iconBg: "bg-[#EFE7FE]",
    },
    {
      id:     "invalid",
      label:  "Invalid Count",
      value:  (s.invalidCount ?? 0).toLocaleString(),
      icon:   <WarningTriangleIcon color="#E03A3A" />,
      iconBg: "bg-[#FCE6E6]",
    },
    {
      id:     "catchall",
      label:  "Catchall Count",
      value:  (s.catchallCount ?? 0).toLocaleString(),
      icon:   <WarningTriangleIcon color="#E89B1A" />,
      iconBg: "bg-[#FDEFD3]",
    },
  ];
}

export function BulkStatsRow({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  const tiles = buildTiles(stats);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 rounded-2xl border border-[#DCE6F3] bg-white p-3"
        >
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t.iconBg)}>
            {t.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground leading-tight truncate">{t.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums leading-tight text-[#111827]">
              {t.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
