import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DonutChart } from "@/src/components/charts/DonutChart";
import { formatNumber } from "@/src/lib/utils";
import type { ChartDataPoint } from "../types";

interface ResultsOverviewProps {
  data:  ChartDataPoint[];
  total: number;
}

export function ResultsOverview({ data, total }: ResultsOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Results Overview</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <DonutChart data={data} total={total} />

        <ul className="space-y-2" role="list" aria-label="Chart legend">
          {data.map((item) => {
            const numPct = ((item.value / total) * 100).toFixed(1);
            return (
              <li key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatNumber(item.value)}
                  </span>
                  <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                    {numPct}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <a
          href="/results"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-colors"
        >
          View all results →
        </a>
      </CardContent>
    </Card>
  );
}
