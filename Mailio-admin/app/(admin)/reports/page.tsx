"use client";

import { useState } from "react";
import { TrendingUp, CheckCircle2, Coins, DollarSign, Tag, Download, MoreHorizontal } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import StatusBadge from "@/components/ui/StatusBadge";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { VERIFICATION_TREND, VERIFICATION_BREAKDOWN, SIGNUPS_TREND } from "@/mocks/charts";

const TABS = [
  { key: "single", label: "Single Users" },
  { key: "enterprise", label: "Enterprise Users" },
];

const PLAN_CREDITS = [
  { plan: "Pro Plan", credits: 462000, pct: 36.9 },
  { plan: "Enterprise Plan", credits: 352000, pct: 28.2 },
  { plan: "Basic Plan", credits: 198000, pct: 15.8 },
  { plan: "Free Plan", credits: 128000, pct: 10.2 },
  { plan: "Starter Plan", credits: 110000, pct: 8.8 },
];

const REPORTS = [
  { name: "Verification Summary", type: "Performance", dateRange: "May 20 — May 26, 2025", generatedOn: "2025-05-26 10:30 AM" },
  { name: "Credits Usage Report", type: "Usage", dateRange: "May 20 — May 26, 2025", generatedOn: "2025-05-26 09:15 AM" },
  { name: "Revenue Report", type: "Financial", dateRange: "May 1 — May 26, 2025", generatedOn: "2025-05-26 08:45 AM" },
  { name: "New Signups Report", type: "Growth", dateRange: "May 20 — May 26, 2025", generatedOn: "2025-05-25 11:20 PM" },
  { name: "Offer Redemption Report", type: "Marketing", dateRange: "May 20 — May 26, 2025", generatedOn: "2025-05-25 10:10 PM" },
];

export default function ReportsPage() {
  const [tab, setTab] = useState("single");
  const [period, setPeriod] = useState("7d");

  return (
    <div>
      <Tabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        actions={
          <>
            <DateRangeFilter value={period} onChange={setPeriod} className="w-44" />
            <Button variant="secondary" size="sm"><Download className="w-4 h-4 mr-1.5" />Export</Button>
          </>
        }
        className="mb-6"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Total Verifications" value="125,430" icon={TrendingUp} accent="blue" delta={18.6} />
        <StatCard label="Valid Rate" value="68.1%" icon={CheckCircle2} accent="green" delta={5.7} />
        <StatCard label="Credits Used" value="1,250,000" icon={Coins} accent="orange" delta={6.7} />
        <StatCard label="Revenue" value="₹1,25,000" icon={DollarSign} accent="purple" delta={22.3} />
        <StatCard label="Offer Redemptions" value="2,450" icon={Tag} accent="sky" delta={18.6} className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card className="p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Verification Trend</h3>
            <span className="text-xs text-text-muted">Last 7 Days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={VERIFICATION_TREND}>
              <defs>
                <linearGradient id="vt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="verifications" stroke="#2563eb" strokeWidth={2.5} fill="url(#vt)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 text-xs mt-3 pt-3 border-t border-gray-100">
            <div><p className="text-text-muted">Total</p><p className="font-bold">125,430</p></div>
            <div><p className="text-text-muted">Valid</p><p className="font-bold text-emerald-600">85,430</p></div>
            <div><p className="text-text-muted">Invalid</p><p className="font-bold text-red-500">28,450</p></div>
            <div><p className="text-text-muted">Failed</p><p className="font-bold text-text-secondary">11,550</p></div>
          </div>
        </Card>

        <Card className="p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Verification Breakdown by Status</h3>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={VERIFICATION_BREAKDOWN} dataKey="value" innerRadius={55} outerRadius={80} stroke="none">
                  {VERIFICATION_BREAKDOWN.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-xl font-bold text-text-primary">125,430</p>
              <p className="text-[10px] text-text-muted">Total</p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs mt-3">
            {VERIFICATION_BREAKDOWN.map((b) => {
              const total = VERIFICATION_BREAKDOWN.reduce((s, x) => s + x.value, 0);
              return (
                <div key={b.name} className="flex justify-between">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: b.color }} />{b.name}</span>
                  <span className="font-semibold">{b.value.toLocaleString()} <span className="font-normal text-text-muted">({(b.value / total * 100).toFixed(1)}%)</span></span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Credits Usage by Plan</h3>
          <div className="space-y-3">
            {PLAN_CREDITS.map((p) => (
              <div key={p.plan}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">{p.plan}</span>
                  <span className="font-semibold">{p.credits.toLocaleString()} <span className="text-text-muted ml-1">{p.pct}%</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-primary-500" style={{ width: `${p.pct * 2.5}%` }} /></div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-gray-100 text-sm">
              <span className="text-text-muted">Total Credits Used</span>
              <span className="font-bold">1,250,000</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-3 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">New Signups Trend</h3>
            <span className="text-xs text-text-muted">Last 7 Days</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={SIGNUPS_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="singleUsers" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="enterprises" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 text-xs mt-3 pt-3 border-t border-gray-100">
            <div><span className="flex items-center gap-1.5 text-text-muted"><span className="w-2 h-2 rounded-full bg-primary-600" />Single Users</span><p className="font-bold mt-0.5">276 <span className="font-normal text-emerald-600">↑ 16.4%</span></p></div>
            <div><span className="flex items-center gap-1.5 text-text-muted"><span className="w-2 h-2 rounded-full bg-emerald-500" />Enterprises</span><p className="font-bold mt-0.5">36 <span className="font-normal text-emerald-600">↑ 28.6%</span></p></div>
          </div>
        </Card>

        <Card noPadding className="lg:col-span-2">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Reports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  {["Report Name", "Type", "Date Range", "Generated On", "Status", "Action"].map((h) => (
                    <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REPORTS.map((r) => (
                  <tr key={r.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">{r.name}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{r.type}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs">{r.dateRange}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs whitespace-nowrap">{r.generatedOn}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label="Completed" tone="green" /></td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded hover:bg-gray-100"><Download className="w-3.5 h-3.5 text-text-muted" /></button>
                        <button className="p-1.5 rounded hover:bg-gray-100"><MoreHorizontal className="w-3.5 h-3.5 text-text-muted" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
