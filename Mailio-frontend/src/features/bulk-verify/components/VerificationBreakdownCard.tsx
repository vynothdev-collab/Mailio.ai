import { MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart } from "@/src/components/charts/DonutChart";
import { formatNumber } from "@/src/lib/utils";
import type { BulkBreakdownDto } from "@/src/types/bulk";

interface Props {
  breakdown: BulkBreakdownDto | null;
  loading:   boolean;
}

function Header() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-[#111827]">Verification Breakdown</h2>
        <p className="mt-1 text-xs text-muted-foreground">Last 30 days · auto-updated</p>
      </div>
      <button
        type="button"
        aria-label="More options"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#DCE6F3] bg-white text-muted-foreground hover:bg-[#F4F8FF] transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>
    </div>
  );
}

export function VerificationBreakdownCard({ breakdown, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-2 space-y-4">
          <Header />
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

  if (!breakdown || breakdown.total === 0) {
    return (
      <Card>
        <CardContent className="pt-2 space-y-4">
          <Header />
          <p className="py-6 text-center text-xs text-muted-foreground">
            No verification data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = breakdown.data.map((d) => ({
    name:       d.name,
    value:      d.value,
    percentage: `${d.percentage.toFixed(1)}%`,
    color:      d.color,
  }));

  return (
    <Card>
      <CardContent className="pt-2 space-y-5">
        <Header />

        <div className="flex flex-col items-center">
          <DonutChart data={chartData} total={breakdown.total} />
        </div>

        <ul className="space-y-3" role="list">
          {chartData.map((item) => {
            const pct = breakdown.total > 0 ? (item.value / breakdown.total) * 100 : 0;
            return (
              <li key={item.name} className="space-y-1">
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-[#111827]">{item.name}</span>
                  <div className="ml-2 flex-1 h-1.5 rounded-full bg-[#EEF3FB] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-bold tabular-nums text-[#111827]">
                    {formatNumber(item.value)}
                  </span>
                  <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                    {item.percentage}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <a
          href="/results"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F5BFF] hover:underline"
        >
          View all results <span aria-hidden>→</span>
        </a>
      </CardContent>
    </Card>
  );
}
