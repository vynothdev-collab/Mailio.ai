import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart } from "@/src/components/charts/DonutChart";
import { formatNumber } from "@/src/lib/utils";
import type { BulkBreakdownDto } from "@/src/types/bulk";

interface Props {
  breakdown: BulkBreakdownDto | null;
  loading:   boolean;
}

export function VerificationBreakdownCard({ breakdown, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-2 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!breakdown || breakdown.total === 0) {
    return (
      <Card>
        <CardContent className="pt-2 space-y-2">
          <h2 className="text-sm font-semibold">Verification Breakdown</h2>
          <p className="text-xs text-muted-foreground py-6 text-center">
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
      <CardContent className="pt-2 space-y-3">
        <h2 className="text-sm font-semibold">Verification Breakdown</h2>

        <DonutChart data={chartData} total={breakdown.total} />

        <ul className="space-y-1.5" role="list">
          {chartData.map((item) => (
            <li key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">{formatNumber(item.value)}</span>
                <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{item.percentage}</span>
              </div>
            </li>
          ))}
        </ul>

        <a href="/results" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          View full results →
        </a>
      </CardContent>
    </Card>
  );
}
