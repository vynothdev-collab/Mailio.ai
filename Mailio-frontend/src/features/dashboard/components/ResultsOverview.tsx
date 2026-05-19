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
        <p className="text-xs text-muted-foreground">Last 30 days · auto-updated</p>
      </CardHeader>

      <CardContent className="space-y-5">
        <DonutChart data={data} total={total} />

        <ul className="space-y-3" role="list" aria-label="Chart legend">
          {data.map((item) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <li key={item.name} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="text-sm text-foreground">{item.name}</span>
                  <div className="ml-2 flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-semibold tabular-nums">
                    {formatNumber(item.value)}
                  </span>
                  <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <a
          href="/results"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F5BFF] hover:underline"
        >
          View all results →
        </a>
      </CardContent>
    </Card>
  );
}
