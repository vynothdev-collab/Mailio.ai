"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import AdminSummaryCard from "@/components/ui/AdminSummaryCard";
import AdminStatusBadge from "@/components/ui/AdminStatusBadge";
import { adminDashboardService } from "@/services/admin.service";
import type { DashboardOverview } from "@/types";
import { PLAN_LABELS, PLAN_COLORS } from "@/constants";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    adminDashboardService
      .getOverview(period)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      {/* User Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminSummaryCard
          label="Total Users"
          value={loading ? "—" : (data?.users.total ?? 0)}
          accent="blue"
        />
        <AdminSummaryCard
          label="Active Users"
          value={loading ? "—" : (data?.users.active ?? 0)}
          accent="green"
        />
        <AdminSummaryCard
          label="Today's Signups"
          value={loading ? "—" : (data?.users.todaySignups ?? 0)}
          accent="purple"
        />
        <AdminSummaryCard
          label="Pro Users"
          value={loading ? "—" : (data?.users.byPlan.PRO ?? 0)}
          sub={`Ultimate: ${data?.users.byPlan.ULTIMATE ?? 0}`}
          accent="orange"
        />
      </div>

      {/* Verification Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminSummaryCard
          label="Total Verifications"
          value={loading ? "—" : (data?.verifications.total ?? 0)}
          accent="blue"
        />
        <AdminSummaryCard
          label="Valid"
          value={loading ? "—" : `${data?.verifications.valid ?? 0}`}
          sub={`${data?.verifications.validRate ?? 0}%`}
          accent="green"
        />
        <AdminSummaryCard
          label="Invalid"
          value={loading ? "—" : `${data?.verifications.invalid ?? 0}`}
          sub={`${data?.verifications.invalidRate ?? 0}%`}
          accent="red"
        />
        <AdminSummaryCard
          label="Risky"
          value={loading ? "—" : `${data?.verifications.risky ?? 0}`}
          sub={`${data?.verifications.riskyRate ?? 0}%`}
          accent="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Daily Verification Trend</h2>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-sm">Loading…</div>
          ) : !data?.dailyTrend.length ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-sm">No data for this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-left text-text-muted font-medium">Date</th>
                    <th className="py-2 text-right text-text-muted font-medium">Total</th>
                    <th className="py-2 text-right text-green-600 font-medium">Valid</th>
                    <th className="py-2 text-right text-red-500 font-medium">Invalid</th>
                    <th className="py-2 text-right text-orange-500 font-medium">Risky</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyTrend.map((row) => (
                    <tr key={row.date} className="border-b border-gray-50">
                      <td className="py-1.5 text-text-secondary">{row.date}</td>
                      <td className="py-1.5 text-right font-medium">{row.total}</td>
                      <td className="py-1.5 text-right text-green-600">{row.valid}</td>
                      <td className="py-1.5 text-right text-red-500">{row.invalid}</td>
                      <td className="py-1.5 text-right text-orange-500">{row.risky}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Users */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Recent Signups</h2>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-sm">Loading…</div>
          ) : !data?.recentUsers.length ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-sm">No users yet</div>
          ) : (
            <div className="space-y-2">
              {data.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[user.plan] ?? "bg-gray-100 text-gray-600"}`}>
                      {PLAN_LABELS[user.plan] ?? user.plan}
                    </span>
                    <AdminStatusBadge active={user.isActive} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
