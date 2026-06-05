"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  Coins,
  CreditCard,
  Building2,
  TrendingUp,
  CalendarClock,
  Plus,
  FileText,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import ChartCard from "@/components/ui/ChartCard";
import Tabs from "@/components/ui/Tabs";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { PLAN_COLORS, PLAN_LABELS } from "@/constants";
import {
  dashboardService,
  type SingleOverview,
  type EnterpriseOverview,
} from "@/services/dashboard.service";

const TABS = [
  { key: "single", label: "Single Users" },
  { key: "enterprise", label: "Enterprise Users" },
];

const PLAN_BAR_COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-sky-400",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function DashboardPage() {
  const [tab, setTab] = useState<string>("single");
  const [period, setPeriod] = useState("7d");

  return (
    <div>
      <Tabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        actions={<DateRangeFilter value={period} onChange={setPeriod} className="w-44" />}
        className="mb-6"
      />

      {tab === "single" ? (
        <SingleUsersDashboard period={period} />
      ) : (
        <EnterpriseDashboard period={period} />
      )}
    </div>
  );
}

function useFetch<T>(load: () => Promise<T>, deps: ReadonlyArray<unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const reqIdRef = useRef(0);

  const run = useCallback(async (force = false) => {
    const key = JSON.stringify(deps);
    if (!force && lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    const reqId = ++reqIdRef.current;

    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (reqId === reqIdRef.current) setData(result);
    } catch (e) {
      if (reqId === reqIdRef.current) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refresh: () => run(true) };
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <AlertCircle className="w-6 h-6 text-red-500" />
      <p className="text-sm text-text-secondary">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs text-primary-600 font-medium hover:underline"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );
}

function SingleUsersDashboard({ period }: { period: string }) {
  const { data, loading, error, refresh } = useFetch<SingleOverview>(
    () => dashboardService.single(period),
    [period],
  );

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return null;

  const { kpis, verifications, credits, expiryAlerts, verificationTrend, signupTrend, recentUsers } = data;

  const donut = [
    { name: "Used", value: credits.used, color: "#2563eb" },
    { name: "Remaining", value: credits.remaining, color: "#e5e7eb" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Registered Users" value={fmt(kpis.registeredUsers)} icon={Users} accent="blue" delta={kpis.deltas.registeredUsers} deltaLabel="vs last period" />
        <StatCard label="Active Users" value={fmt(kpis.activeUsers)} icon={UserCheck} accent="green" delta={kpis.deltas.activeUsers} deltaLabel="vs last period" />
        <StatCard label="Today's Signups" value={fmt(kpis.todaysSignups)} icon={UserPlus} accent="purple" delta={kpis.deltas.todaysSignups} deltaLabel="vs yesterday" />
        <StatCard label="Credits Used" value={fmt(kpis.creditsUsed)} icon={Coins} accent="orange" delta={kpis.deltas.creditsUsed} deltaLabel="vs last period" />
        <StatCard label="Credits Remaining" value={fmt(kpis.creditsRemaining)} icon={CreditCard} accent="blue" sub="Total Balance" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Verifications" value={fmt(verifications.total)} icon={TrendingUp} accent="blue" delta={verifications.deltas.total} deltaLabel="vs last period" />
        <StatCard label="Valid Rate" value={`${verifications.validRate}%`} icon={UserCheck} accent="green" delta={verifications.deltas.validRate} deltaLabel="vs last period" />
        <StatCard label="Invalid Rate" value={`${verifications.invalidRate}%`} icon={AlertCircle} accent="red" delta={verifications.deltas.invalidRate} deltaLabel="vs last period" />
        <StatCard label="Catchall Rate" value={`${verifications.catchallRate}%`} icon={AlertCircle} accent="orange" delta={verifications.deltas.catchallRate} deltaLabel="vs last period" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-3 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Plan Expiry Alerts</h3>
            <a href="/expiry" className="text-xs text-primary-600 font-medium hover:underline">View All</a>
          </div>
          <div className="space-y-3">
            {expiryAlerts.top.length === 0 && (
              <p className="text-xs text-text-muted text-center py-8">No expiring plans</p>
            )}
            {expiryAlerts.top.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{u.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{u.planName} • {u.daysRemaining} days left</p>
                </div>
                <StatusBadge label="Expiring" tone="amber" />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted text-center">
              You have <span className="font-semibold text-amber-600">{expiryAlerts.expiringIn7dCount}</span> plans expiring within 7 days.
            </p>
          </div>
        </Card>

        <ChartCard
          title="Email Verification Activity"
          className="lg:col-span-1"
          footer={
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-text-muted">Total</p><p className="font-bold text-text-primary mt-0.5">{fmt(verifications.total)}</p></div>
              <div><p className="text-text-muted">Valid</p><p className="font-bold text-emerald-600 mt-0.5">{fmt(verifications.valid)} <span className="font-normal text-[10px]">({verifications.validRate}%)</span></p></div>
              <div><p className="text-text-muted">Invalid</p><p className="font-bold text-red-500 mt-0.5">{fmt(verifications.invalid)} <span className="font-normal text-[10px]">({verifications.invalidRate}%)</span></p></div>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={verificationTrend}>
              <defs>
                <linearGradient id="vGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} fill="url(#vGradient)" name="Verifications" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Credit Usage"
          className="lg:col-span-1"
          footer={
            <div className="flex justify-between text-xs">
              <p className="text-text-muted">Total Credits</p>
              <p className="font-bold text-text-primary">{fmt(credits.total)}</p>
            </div>
          }
        >
          <div className="relative flex items-center justify-center" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={55} outerRadius={80} startAngle={90} endAngle={-270} stroke="none">
                  {donut.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-text-primary leading-none">{credits.usedPct}%</p>
              <p className="text-[10px] text-text-muted mt-1">Used</p>
            </div>
          </div>
          <div className="flex justify-around mt-3 text-xs">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary-600" /><span className="text-text-muted">Used</span><span className="font-semibold ml-1">{fmt(credits.used)}</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-200" /><span className="text-text-muted">Remaining</span><span className="font-semibold ml-1">{fmt(credits.remaining)}</span></div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-3 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Users</h3>
            <a href="/users" className="text-xs text-primary-600 font-medium hover:underline">View All</a>
          </div>
          <div className="space-y-3">
            {recentUsers.length === 0 && (
              <p className="text-xs text-text-muted text-center py-8">No users yet</p>
            )}
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-1">
                <Avatar name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{u.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                </div>
                {u.plan && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PLAN_COLORS[u.plan] ?? "bg-gray-100 text-gray-700"}`}>
                    {PLAN_LABELS[u.plan] ?? u.plan}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        <ChartCard title="User Signup Trend" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={signupTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Signups" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <QuickActionsCard
        actions={[
          { label: "Add New User", icon: Plus, href: "/users" },
          { label: "Assign User Credits", icon: Coins, href: "/credits" },
          { label: "View User Report", icon: FileText, href: "/reports" },
        ]}
      />
    </div>
  );
}

function EnterpriseDashboard({ period }: { period: string }) {
  const { data, loading, error, refresh } = useFetch<EnterpriseOverview>(
    () => dashboardService.enterprise(period),
    [period],
  );

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return null;

  const { kpis, usageTrend, planDistribution, recentEnterprises, expiryAlerts } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Enterprises" value={fmt(kpis.totalEnterprises)} icon={Building2} accent="blue" delta={kpis.deltas.totalEnterprises} deltaLabel="vs last period" />
        <StatCard label="Active Enterprises" value={fmt(kpis.activeEnterprises)} icon={UserCheck} accent="green" delta={kpis.deltas.activeEnterprises} deltaLabel="vs last period" />
        <StatCard label="Enterprise Users" value={fmt(kpis.enterpriseUsers)} icon={Users} accent="purple" delta={kpis.deltas.enterpriseUsers} deltaLabel="vs last period" />
        <StatCard label="Team Credits Assigned" value={fmt(kpis.teamCreditsAssigned)} icon={Coins} accent="orange" delta={kpis.deltas.teamCreditsAssigned} deltaLabel="vs last period" />
        <StatCard label="Expiring Plans" value={fmt(kpis.expiringPlans)} icon={CalendarClock} accent="red" delta={kpis.deltas.expiringPlans} deltaLabel="vs last period" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-3 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Plan Expiry Alerts</h3>
            <a href="/expiry" className="text-xs text-primary-600 font-medium hover:underline">View All</a>
          </div>
          <div className="space-y-3">
            {expiryAlerts.top.length === 0 && (
              <p className="text-xs text-text-muted text-center py-8">No expiring plans</p>
            )}
            {expiryAlerts.top.map((e) => (
              <div key={e.id} className="flex items-center gap-3">
                <Avatar name={e.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{e.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{e.planName} • {e.daysRemaining} days left</p>
                </div>
                <StatusBadge label="Expiring" tone="amber" />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted text-center">
              You have <span className="font-semibold text-amber-600">{expiryAlerts.expiringIn7dCount}</span> enterprise plans expiring within 7 days.
            </p>
          </div>
        </Card>

        <ChartCard title="Company Usage Trend" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={usageTrend}>
              <defs>
                <linearGradient id="eGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="verifications" stroke="#7c3aed" strokeWidth={2} fill="url(#eGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="p-3 sm:p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Enterprise Plan Distribution</h3>
          <div className="space-y-3">
            {planDistribution.length === 0 && (
              <p className="text-xs text-text-muted text-center py-8">No active plans</p>
            )}
            {planDistribution.map((row, i) => (
              <div key={row.planName}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary font-medium">{row.planName}</span>
                  <span className="text-text-muted">{row.count} companies</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${PLAN_BAR_COLORS[i % PLAN_BAR_COLORS.length]}`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Recent Enterprise Accounts</h3>
          <a href="/enterprise" className="text-xs text-primary-600 font-medium hover:underline">View All</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">Enterprise</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">Plan</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">Users</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">Credits Used</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEnterprises.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-text-muted">No enterprises yet</td></tr>
              )}
              {recentEnterprises.map((e) => {
                const pct = e.creditsAssigned > 0
                  ? Math.round((e.creditsUsed / e.creditsAssigned) * 1000) / 10
                  : 0;
                return (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.name} size="sm" />
                        <div>
                          <p className="font-medium text-text-primary text-sm">{e.name}</p>
                          <p className="text-[11px] text-text-muted">{e.domain || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-text-secondary">{e.planName}</td>
                    <td className="px-3 py-3 text-text-secondary">{e.users}</td>
                    <td className="px-3 py-3 text-text-secondary">
                      {fmt(e.creditsUsed)}
                      {e.creditsAssigned > 0 && <span className="text-text-muted text-xs"> ({pct}%)</span>}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge label={e.status} tone={e.status === "Active" ? "green" : "red"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <QuickActionsCard
        actions={[
          { label: "Create Enterprise", icon: Plus, href: "/enterprise" },
          { label: "Assign Team Credits", icon: Coins, href: "/credits" },
          { label: "View Enterprise Report", icon: FileText, href: "/reports" },
        ]}
      />
    </div>
  );
}

function QuickActionsCard({
  actions,
}: {
  actions: Array<{ label: string; icon: React.ComponentType<{ className?: string }>; href: string }>;
}) {
  return (
    <Card className="p-3 sm:p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <a
              key={a.label}
              href={a.href}
              className="flex items-center justify-between gap-3 px-4 py-3 border border-gray-100 rounded-lg hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary-600" />
                </span>
                <span className="text-sm font-medium text-text-primary">{a.label}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </a>
          );
        })}
      </div>
    </Card>
  );
}
