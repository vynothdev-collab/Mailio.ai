"use client";

import { useState } from "react";
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
import { MOCK_USERS } from "@/mocks/users";
import { MOCK_ENTERPRISES } from "@/mocks/enterprises";
import { VERIFICATION_TREND, SIGNUPS_TREND, CREDIT_USAGE_DONUT } from "@/mocks/charts";
import { PLAN_COLORS, PLAN_LABELS } from "@/constants";

const TABS = [
  { key: "single", label: "Single Users" },
  { key: "enterprise", label: "Enterprise Users" },
];

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

      {tab === "single" ? <SingleUsersDashboard /> : <EnterpriseDashboard />}
    </div>
  );
}

function SingleUsersDashboard() {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Registered Users" value="12,458" icon={Users} accent="blue" delta={14.8} deltaLabel="vs last week" />
        <StatCard label="Active Users" value="4,892" icon={UserCheck} accent="green" delta={8.7} deltaLabel="vs last week" />
        <StatCard label="Today's Signups" value="312" icon={UserPlus} accent="purple" delta={18.6} deltaLabel="vs yesterday" />
        <StatCard label="Credits Used" value="1.23M" icon={Coins} accent="orange" delta={6.3} deltaLabel="vs last week" />
        <StatCard label="Credits Remaining" value="3.77M" icon={CreditCard} accent="blue" sub="Total Balance" className="col-span-2 lg:col-span-1" />
      </div>

      {/* Secondary metrics: verification stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Verifications" value="125,430" icon={TrendingUp} accent="blue" delta={18.6} deltaLabel="vs last week" />
        <StatCard label="Valid Rate" value="68.1%" icon={UserCheck} accent="green" delta={5.7} deltaLabel="vs last week" />
        <StatCard label="Invalid Rate" value="22.7%" icon={AlertCircle} accent="red" delta={-2.1} deltaLabel="vs last week" />
        <StatCard label="Risky Rate" value="9.2%" icon={AlertCircle} accent="orange" delta={1.3} deltaLabel="vs last week" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-3 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Plan Expiry Alerts</h3>
            <button className="text-xs text-primary-600 font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {MOCK_USERS.filter((u) => u.status === "Expiring Soon").slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{u.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{PLAN_LABELS[u.plan]} • {u.expiryInDays} days left</p>
                </div>
                <StatusBadge label="Expiring" tone="amber" />
              </div>
            ))}
            {MOCK_USERS.filter((u) => u.status === "Expiring Soon").length === 0 && (
              <p className="text-xs text-text-muted text-center py-8">No expiring plans</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted text-center">
              You have <span className="font-semibold text-amber-600">2</span> plans expiring within 7 days.
            </p>
          </div>
        </Card>

        <ChartCard
          title="Email Verification Activity"
          actions={<DateRangePill />}
          className="lg:col-span-1"
          footer={
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-text-muted">Total Emails</p><p className="font-bold text-text-primary mt-0.5">125,430</p></div>
              <div><p className="text-text-muted">Valid</p><p className="font-bold text-emerald-600 mt-0.5">85,430 <span className="font-normal text-[10px]">(68.1%)</span></p></div>
              <div><p className="text-text-muted">Invalid</p><p className="font-bold text-red-500 mt-0.5">28,450 <span className="font-normal text-[10px]">(22.7%)</span></p></div>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={VERIFICATION_TREND}>
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
              <Area type="monotone" dataKey="verifications" stroke="#2563eb" strokeWidth={2} fill="url(#vGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Credit Usage"
          actions={<DateRangePill />}
          className="lg:col-span-1"
          footer={
            <div className="flex justify-between text-xs">
              <p className="text-text-muted">Total Credits</p>
              <p className="font-bold text-text-primary">5.00M</p>
            </div>
          }
        >
          <div className="relative flex items-center justify-center" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={CREDIT_USAGE_DONUT} dataKey="value" innerRadius={55} outerRadius={80} startAngle={90} endAngle={-270} stroke="none">
                  {CREDIT_USAGE_DONUT.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-text-primary leading-none">24.6%</p>
              <p className="text-[10px] text-text-muted mt-1">Used</p>
            </div>
          </div>
          <div className="flex justify-around mt-3 text-xs">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary-600" /><span className="text-text-muted">Used</span><span className="font-semibold ml-1">1.23M</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-200" /><span className="text-text-muted">Remaining</span><span className="font-semibold ml-1">3.77M</span></div>
          </div>
        </ChartCard>
      </div>

      {/* Recent activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-3 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Users</h3>
            <button className="text-xs text-primary-600 font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {MOCK_USERS.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-1">
                <Avatar name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{u.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PLAN_COLORS[u.plan]}`}>{PLAN_LABELS[u.plan]}</span>
              </div>
            ))}
          </div>
        </Card>

        <ChartCard title="User Signup Trend" actions={<DateRangePill />} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={SIGNUPS_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="singleUsers" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Single Users" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Quick actions */}
      <QuickActionsCard
        actions={[
          { label: "Add New User", icon: Plus },
          { label: "Assign User Credits", icon: Coins },
          { label: "View User Report", icon: FileText },
        ]}
      />
    </div>
  );
}

function EnterpriseDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Enterprises" value="25" icon={Building2} accent="blue" delta={4.2} deltaLabel="vs last week" />
        <StatCard label="Active Enterprises" value="18" icon={UserCheck} accent="green" delta={5.9} deltaLabel="vs last week" />
        <StatCard label="Enterprise Users" value="811" icon={Users} accent="purple" delta={7.3} deltaLabel="vs last week" />
        <StatCard label="Team Credits Assigned" value="2.31M" icon={Coins} accent="orange" delta={6.8} deltaLabel="vs last week" />
        <StatCard label="Expiring Plans" value="4" icon={CalendarClock} accent="red" delta={-33.3} deltaLabel="vs last week" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <ChartCard title="Company Usage Trend" actions={<DateRangePill />} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={VERIFICATION_TREND}>
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

        <Card className="p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Enterprise Plan Distribution</h3>
          <div className="space-y-3">
            {[
              { plan: "Enterprise Plus", count: 5, pct: 60, color: "bg-purple-500" },
              { plan: "Enterprise Pro", count: 12, pct: 30, color: "bg-blue-500" },
              { plan: "Enterprise Basic", count: 8, pct: 10, color: "bg-sky-400" },
            ].map((row) => (
              <div key={row.plan}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary font-medium">{row.plan}</span>
                  <span className="text-text-muted">{row.count} companies</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Recent Enterprise Accounts</h3>
          <button className="text-xs text-primary-600 font-medium hover:underline">View All</button>
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
              {MOCK_ENTERPRISES.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={e.name} size="sm" />
                      <div>
                        <p className="font-medium text-text-primary text-sm">{e.name}</p>
                        <p className="text-[11px] text-text-muted">{e.domain}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-text-secondary">{PLAN_LABELS[e.plan]}</td>
                  <td className="px-3 py-3 text-text-secondary">{e.users}</td>
                  <td className="px-3 py-3 text-text-secondary">{e.creditsUsed.toLocaleString()} <span className="text-text-muted text-xs">({Math.round((e.creditsUsed / e.creditsAssigned) * 1000) / 10}%)</span></td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      label={e.status}
                      tone={e.status === "Active" ? "green" : e.status === "Expiring Soon" ? "amber" : "red"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <QuickActionsCard
        actions={[
          { label: "Create Enterprise", icon: Plus },
          { label: "Assign Team Credits", icon: Coins },
          { label: "View Enterprise Report", icon: FileText },
        ]}
      />
    </div>
  );
}

function DateRangePill() {
  return (
    <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-secondary border border-gray-200 rounded-md hover:bg-gray-50">
      Last 7 Days <ChevronRight className="w-3 h-3 rotate-90" />
    </button>
  );
}

function QuickActionsCard({
  actions,
}: {
  actions: Array<{ label: string; icon: React.ComponentType<{ className?: string }> }>;
}) {
  return (
    <Card className="p-3 sm:p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              className="flex items-center justify-between gap-3 px-4 py-3 border border-gray-100 rounded-lg hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary-600" />
                </span>
                <span className="text-sm font-medium text-text-primary">{a.label}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}
