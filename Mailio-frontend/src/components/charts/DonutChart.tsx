"use client";

import { memo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/src/lib/utils";
import type { ChartDataPoint } from "@/src/features/dashboard/types";

interface DonutChartProps {
  data:  ChartDataPoint[];
  total: number;
}

interface TooltipPayload {
  name:  string;
  value: number;
  payload: ChartDataPoint;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-float text-xs">
      <p className="font-semibold text-slate-800">{item.name}</p>
      <p className="text-slate-500">
        {formatNumber(item.value)} · {item.payload.percentage}
      </p>
    </div>
  );
}

export const DonutChart = memo(({ data, total }: DonutChartProps) => (
  <div className="relative h-52 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="62%"
          outerRadius="82%"
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>

    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
        {formatNumber(total)}
      </span>
      <span className="mt-1 text-xs font-medium text-slate-400">Total</span>
    </div>
  </div>
));
DonutChart.displayName = "DonutChart";
