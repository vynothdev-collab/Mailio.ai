"use client";

import { useState } from "react";
import { Coins, CreditCard, Database, TrendingUp, FileText, Download, Plus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { MOCK_CREDIT_TRANSACTIONS, MOCK_RECENT_ASSIGNMENTS, MOCK_USAGE_TREND } from "@/mocks/credits";

const TABS = [
  { key: "single", label: "Single Users" },
  { key: "enterprise", label: "Enterprise Users" },
];

export default function CreditsPage() {
  const [tab, setTab] = useState("single");
  const [period, setPeriod] = useState("30d");

  return (
    <div>
      <Tabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        actions={<DateRangeFilter value={period} onChange={setPeriod} className="w-44" />}
        className="mb-6"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Total Credits Assigned" value="4,400,000" icon={Database} accent="blue" delta={8.4} deltaLabel="vs last week" />
        <StatCard label="Total Credits Used" value="1,250,000" icon={Coins} accent="green" delta={6.7} deltaLabel="vs last week" />
        <StatCard label="Remaining Credits" value="3,150,000" icon={CreditCard} accent="orange" delta={5.2} deltaLabel="vs last week" />
        <StatCard label="Usage This Month" value="285,400" icon={TrendingUp} accent="purple" delta={12.8} deltaLabel="vs last month" />
        <StatCard label="Active Credit Plans" value="24" icon={FileText} accent="indigo" sub="Manual Assignments: 156" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card className="p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Credits Usage Overview</h3>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={[{ v: 28.4 }, { v: 71.6 }]} dataKey="v" innerRadius={55} outerRadius={75} startAngle={90} endAngle={-270} stroke="none">
                  <Cell fill="#2563eb" />
                  <Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-2xl font-bold text-text-primary">28.4%</p>
              <p className="text-[10px] text-text-muted">Used</p>
            </div>
          </div>
          <div className="space-y-2 text-xs mt-3">
            <div className="flex justify-between"><span className="flex items-center gap-1.5 text-text-muted"><span className="w-2 h-2 rounded-full bg-primary-600" />Used</span><span className="font-semibold">1,250,000 (28.4%)</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-1.5 text-text-muted"><span className="w-2 h-2 rounded-full bg-gray-300" />Remaining</span><span className="font-semibold">3,150,000 (71.6%)</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-100 mt-2"><span className="text-text-muted">Total Credits Assigned</span><span className="font-bold">4,400,000</span></div>
          </div>
        </Card>

        <Card className="p-3 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Credits Usage Over Time</h3>
            <span className="text-xs text-text-muted">Last 30 Days</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={MOCK_USAGE_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-3 border-t border-gray-100">
            <div><p className="text-text-muted">This Period</p><p className="font-bold">1,250,000</p></div>
            <div><p className="text-text-muted">Last Period</p><p className="font-bold">1,108,000</p></div>
            <div><p className="text-text-muted">Change</p><p className="font-bold text-emerald-600">↑ 12.8%</p></div>
          </div>
        </Card>

        {/* Assign credits */}
        <Card className="p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-1.5"><Plus className="w-4 h-4 text-primary-600" />Assign Credits</h3>
          <div className="space-y-3 text-sm">
            <Field label="Assign To"><select className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg"><option>Select user or enterprise</option></select></Field>
            <Field label="Credit Plan"><select className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg"><option>Select credit plan</option></select></Field>
            <Field label="Amount"><input className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg" placeholder="Enter amount" /></Field>
            <Field label="Note (Optional)"><input className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg" placeholder="Add a note..." /></Field>
            <Button variant="primary" className="w-full">Assign Credits</Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card noPadding className="lg:col-span-2">
          <div className="flex items-center justify-between p-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Credit Transactions</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm"><Download className="w-4 h-4 mr-1.5" />Export</Button>
              <button className="text-xs text-primary-600 font-medium hover:underline">View All</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  {["Date", "User", "Type", "Credits", "Balance", "Description", "Method"].map((h) => (
                    <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_CREDIT_TRANSACTIONS.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs whitespace-nowrap">{t.date}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={t.userName} size="xs" />
                        <span className="text-text-secondary text-xs">{t.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={t.type} tone={t.type === "Added" ? "green" : t.type === "Used" ? "red" : "blue"} /></td>
                    <td className={`px-4 py-3 font-semibold ${t.credits > 0 ? "text-emerald-600" : "text-red-500"}`}>{t.credits > 0 ? "+" : ""}{t.credits.toLocaleString()}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">{t.balance.toLocaleString()}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs">{t.description}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={t.method} tone={t.method === "Manual" ? "blue" : "gray"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-3 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Recent Assignments</h3>
            <button className="text-xs text-primary-600 font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {MOCK_RECENT_ASSIGNMENTS.map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                <Avatar name={a.userName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{a.userName}</p>
                  <p className="text-[10px] text-text-muted truncate">{a.userEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600">+{a.credits.toLocaleString()}</p>
                  <p className="text-[10px] text-text-muted">{a.assignedAt}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 text-xs text-primary-600 font-medium hover:underline">View All Assignments</button>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}
