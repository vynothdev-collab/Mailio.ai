"use client";

import { memo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { UsageChartPoint } from "@/src/types/usage";

interface Props {
  data:    UsageChartPoint[];
  loading: boolean;
}

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-lg text-[10px] sm:text-xs space-y-0.5 sm:space-y-1">
      <p className="font-semibold text-slate-700 mb-0.5 sm:mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-1 sm:gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-semibold ml-0.5">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export const UsageChart = memo(function UsageChart({ data, loading }: Props) {
  return (
    <Card>
      <CardContent className="pt-3 space-y-2 sm:space-y-3">
        <div>
          <h2 className="text-xs sm:text-sm font-semibold">Usage Over Time</h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Daily verifications — last 30 days</p>
        </div>

        <div className="h-44 sm:h-56 md:h-64 w-full">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={5} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 10, paddingTop: 6 }}
                />
                <Bar dataKey="single" name="Single" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="bulk"   name="Bulk"   fill="#d946ef" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
