"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp, CheckCircle2, Coins, DollarSign, Tag, Download, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import {
  reportsService,
  type AudienceTab,
  type Period,
  type ReportsSummary,
  type ReportsVerifications,
  type ReportsDistribution,
} from "@/services/reports.service";

const TABS = [
  { key: "single",     label: "Single Users" },
  { key: "enterprise", label: "Enterprise Users" },
];

const PIE_COLORS = {
  valid: "#10b981",
  invalid: "#ef4444",
  catchall: "#f59e0b",
  failed: "#94a3b8",
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function shortDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ReportsPage() {
  const [tab, setTab] = useState<AudienceTab>("single");
  const [period, setPeriod] = useState<Period>("7d");

  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [verif,   setVerif]   = useState<ReportsVerifications | null>(null);
  const [dist,    setDist]    = useState<ReportsDistribution | null>(null);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingVerif,   setLoadingVerif]   = useState(true);
  const [loadingDist,    setLoadingDist]    = useState(true);

  const load = useCallback(async () => {
    setLoadingSummary(true);
    setLoadingVerif(true);
    setLoadingDist(true);

    // All three requests fire in parallel. Each backend endpoint runs its
    // own queries concurrently, so the slowest endpoint defines page load.
    const params = { tab, period };
    void reportsService.summary(params)
      .then(setSummary).catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
    void reportsService.verifications(params)
      .then(setVerif).catch(() => setVerif(null))
      .finally(() => setLoadingVerif(false));
    void reportsService.distribution(params)
      .then(setDist).catch(() => setDist(null))
      .finally(() => setLoadingDist(false));
  }, [tab, period]);

  useEffect(() => { void load(); }, [load]);

  const breakdownData = useMemo(() => {
    if (!verif) return [];
    return [
      { name: "Valid",   value: verif.breakdown.valid,   color: PIE_COLORS.valid   },
      { name: "Invalid", value: verif.breakdown.invalid, color: PIE_COLORS.invalid },
      { name: "Catchall", value: verif.breakdown.catchall, color: PIE_COLORS.catchall },
      { name: "Failed",  value: verif.breakdown.failed,  color: PIE_COLORS.failed  },
    ].filter((b) => b.value > 0);
  }, [verif]);

  const totalBreakdown = verif?.breakdown.total ?? 0;
  const currency = summary?.stats.revenue.currency ?? "INR";

  return (
    <div>
      <Tabs
        tabs={TABS}
        active={tab}
        onChange={(t) => setTab(t as AudienceTab)}
        actions={
          <>
            <DateRangeFilter value={period} onChange={(p) => setPeriod(p as Period)} className="w-44" />
            <Button variant="secondary" size="sm" disabled>
              <Download className="w-4 h-4 mr-1.5" />Export
            </Button>
          </>
        }
        className="mb-6"
      />

      {/* ── Top KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard
          label="Total Verifications"
          value={loadingSummary ? "—" : (summary?.stats.totalVerifications.value ?? 0).toLocaleString()}
          icon={TrendingUp} accent="blue"
          delta={summary?.stats.totalVerifications.deltaPct}
        />
        <StatCard
          label="Valid Rate"
          value={loadingSummary ? "—" : `${summary?.stats.validRate.value ?? 0}%`}
          icon={CheckCircle2} accent="green"
          delta={summary?.stats.validRate.deltaPct}
        />
        <StatCard
          label="Credits Used"
          value={loadingSummary ? "—" : (summary?.stats.creditsUsed.value ?? 0).toLocaleString()}
          icon={Coins} accent="orange"
          delta={summary?.stats.creditsUsed.deltaPct}
        />
        <StatCard
          label="Revenue"
          value={loadingSummary ? "—" : formatCurrency(summary?.stats.revenue.value ?? 0, currency)}
          icon={DollarSign} accent="purple"
          delta={summary?.stats.revenue.deltaPct}
        />
        <StatCard
          label="Offer Redemptions"
          value={loadingSummary ? "—" : (summary?.stats.offerRedemptions.value ?? 0).toLocaleString()}
          icon={Tag} accent="sky"
          delta={summary?.stats.offerRedemptions.deltaPct}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Verification trend */}
        <Card className="p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Verification Trend</h3>
            <span className="text-xs text-text-muted">{labelForPeriod(period)}</span>
          </div>
          <div className="h-[200px]">
            {loadingVerif ? (
              <ChartSpinner />
            ) : !verif || verif.trend.length === 0 ? (
              <EmptyChart label="No verification data for this period" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={verif.trend.map((d) => ({ ...d, date: shortDay(d.date) }))}>
                  <defs>
                    <linearGradient id="vt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} fill="url(#vt)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs mt-3 pt-3 border-t border-gray-100">
            <div><p className="text-text-muted">Total</p>  <p className="font-bold">{(verif?.totals.total ?? 0).toLocaleString()}</p></div>
            <div><p className="text-text-muted">Valid</p>  <p className="font-bold text-emerald-600">{(verif?.totals.valid ?? 0).toLocaleString()}</p></div>
            <div><p className="text-text-muted">Invalid</p><p className="font-bold text-red-500">{(verif?.totals.invalid ?? 0).toLocaleString()}</p></div>
            <div><p className="text-text-muted">Failed</p> <p className="font-bold text-text-secondary">{(verif?.totals.failed ?? 0).toLocaleString()}</p></div>
          </div>
        </Card>

        {/* Verification breakdown */}
        <Card className="p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Verification Breakdown by Status</h3>
          <div className="relative flex items-center justify-center h-[200px]">
            {loadingVerif ? (
              <ChartSpinner />
            ) : breakdownData.length === 0 ? (
              <EmptyChart label="Nothing to break down" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdownData} dataKey="value" innerRadius={55} outerRadius={80} stroke="none">
                      {breakdownData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <p className="text-xl font-bold text-text-primary">{totalBreakdown.toLocaleString()}</p>
                  <p className="text-[10px] text-text-muted">Total</p>
                </div>
              </>
            )}
          </div>
          <div className="space-y-1.5 text-xs mt-3">
            {breakdownData.map((b) => (
              <div key={b.name} className="flex justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                  {b.name}
                </span>
                <span className="font-semibold">
                  {b.value.toLocaleString()}{" "}
                  <span className="font-normal text-text-muted">
                    ({totalBreakdown > 0 ? (b.value / totalBreakdown * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Credits by plan */}
        <Card className="p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Credits Usage by Plan</h3>
          <div className="space-y-3 min-h-[200px]">
            {loadingDist ? (
              <ChartSpinner />
            ) : !dist || dist.creditsByPlan.length === 0 ? (
              <EmptyChart label="No plan usage in this range" />
            ) : (
              <>
                {dist.creditsByPlan.map((p) => (
                  <div key={`${p.planId}-${p.planName}`}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary truncate pr-2">{p.planName}</span>
                      <span className="font-semibold whitespace-nowrap">
                        {p.credits.toLocaleString()}{" "}
                        <span className="text-text-muted ml-1">{p.pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-primary-500"
                        style={{ width: `${Math.min(100, p.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-100 text-sm">
                  <span className="text-text-muted">Total Credits Used</span>
                  <span className="font-bold">
                    {dist.creditsByPlan.reduce((s, x) => s + x.credits, 0).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ── Signups Trend ── */}
      <Card className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">New Signups Trend</h3>
          <span className="text-xs text-text-muted">{labelForPeriod(period)}</span>
        </div>
        <div className="h-[200px]">
          {loadingDist ? (
            <ChartSpinner />
          ) : !dist || dist.signupsTrend.length === 0 ? (
            <EmptyChart label="No signups in this period" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dist.signupsTrend.map((d) => ({ ...d, date: shortDay(d.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Line type="monotone" dataKey="singleUsers" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Single Users" />
                <Line type="monotone" dataKey="enterprises" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Enterprises" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mt-3 pt-3 border-t border-gray-100">
          <div>
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="w-2 h-2 rounded-full bg-primary-600" />Single Users
            </span>
            <p className="font-bold mt-0.5">
              {(dist?.signupsTotals.singleUsers ?? 0).toLocaleString()}
              <DeltaPill value={dist?.signupsTotals.singleUsersDeltaPct ?? 0} />
            </p>
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />Enterprises
            </span>
            <p className="font-bold mt-0.5">
              {(dist?.signupsTotals.enterprises ?? 0).toLocaleString()}
              <DeltaPill value={dist?.signupsTotals.enterprisesDeltaPct ?? 0} />
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function labelForPeriod(p: Period) {
  switch (p) {
    case "today": return "Today";
    case "30d":   return "Last 30 Days";
    case "90d":   return "Last 90 Days";
    case "custom": return "Custom Range";
    default:      return "Last 7 Days";
  }
}

function ChartSpinner() {
  return (
    <div className="flex items-center justify-center h-full text-text-muted">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-xs text-text-muted text-center px-4">
      {label}
    </div>
  );
}

function DeltaPill({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`font-normal ml-1.5 ${positive ? "text-emerald-600" : "text-red-500"}`}>
      {positive ? "↑" : "↓"} {Math.abs(value)}%
    </span>
  );
}
