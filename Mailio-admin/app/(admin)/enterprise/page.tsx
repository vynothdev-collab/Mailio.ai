"use client";

import { useMemo, useState } from "react";
import { Plus, Download, Filter, Building2, UserCheck, Users, Coins, CalendarClock, Eye, Pencil, MoreHorizontal } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import { MOCK_ENTERPRISES, MOCK_TEAM_MEMBERS } from "@/mocks/enterprises";
import { VERIFICATION_TREND } from "@/mocks/charts";
import { PLAN_LABELS } from "@/constants";

export default function EnterprisePage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(MOCK_ENTERPRISES[0].id);

  const filtered = useMemo(
    () => MOCK_ENTERPRISES.filter((e) => `${e.name} ${e.domain}`.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const selected = MOCK_ENTERPRISES.find((e) => e.id === selectedId) ?? MOCK_ENTERPRISES[0];
  const team = MOCK_TEAM_MEMBERS.filter((t) => t.enterpriseId === selected.id);
  const usedPct = Math.round((selected.creditsUsed / selected.creditsAssigned) * 100);

  return (
    <div>
      <PageHeader actions={<Button variant="primary"><Plus className="w-4 h-4 mr-1.5" />Add Enterprise</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Total Enterprises" value="25" icon={Building2} accent="blue" delta={4.2} />
        <StatCard label="Active Enterprises" value="18" icon={UserCheck} accent="green" delta={5.9} />
        <StatCard label="Enterprise Users" value="811" icon={Users} accent="purple" delta={7.3} />
        <StatCard label="Team Credits Assigned" value="2.31M" icon={Coins} accent="orange" delta={6.8} />
        <StatCard label="Expiring Plans" value="4" icon={CalendarClock} accent="red" delta={-33.3} className="col-span-2 lg:col-span-1" />
      </div>

      <Card noPadding className="mb-6">
        <div className="flex items-center justify-between p-4 gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-text-primary">Enterprise Accounts</h3>
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search enterprises..." className="w-56" />
            <Button variant="secondary" size="sm"><Filter className="w-4 h-4 mr-1.5" />Filters</Button>
            <Button variant="secondary" size="sm"><Download className="w-4 h-4 mr-1.5" />Export</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                {["Enterprise", "Domain", "Plan", "Users", "Credits Assigned", "Credits Used", "Renewal Date", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer ${e.id === selectedId ? "bg-primary-50/40" : ""}`}
                >
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={e.name} size="sm" />
                      <p className="font-medium text-text-primary whitespace-nowrap">{e.name}</p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{e.domain}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">{PLAN_LABELS[e.plan]}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{e.users}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">{e.creditsAssigned.toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    {e.creditsUsed.toLocaleString()} <span className="text-text-muted text-xs">({Math.round((e.creditsUsed / e.creditsAssigned) * 1000) / 10}%)</span>
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap">{e.renewalDate}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <StatusBadge label={e.status} tone={e.status === "Active" ? "green" : e.status === "Expiring Soon" ? "amber" : "red"} />
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                      <button className="p-1.5 rounded hover:bg-gray-100"><Eye className="w-4 h-4 text-text-muted" /></button>
                      <button className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-text-muted" /></button>
                      <button className="p-1.5 rounded hover:bg-gray-100"><MoreHorizontal className="w-4 h-4 text-text-muted" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
          <Avatar name={selected.name} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary">{selected.name}</h2>
              <StatusBadge label={selected.status} tone={selected.status === "Active" ? "green" : "amber"} />
            </div>
            <p className="text-xs text-text-muted mt-0.5">{selected.domain} • {PLAN_LABELS[selected.plan]} • Renews on {selected.renewalDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 pt-5">
          <Card className="p-4 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-primary">Team Members ({selected.users})</h3>
              <button className="text-[11px] text-primary-600 font-medium hover:underline">View All</button>
            </div>
            <div className="space-y-2.5">
              {team.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <Avatar name={m.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{m.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{m.role} • {m.email}</p>
                  </div>
                  <StatusBadge label={m.status} tone={m.status === "Active" ? "green" : "gray"} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-text-primary mb-3">Credits Overview</h3>
            <div className="relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Used", value: usedPct },
                      { name: "Remaining", value: 100 - usedPct },
                    ]}
                    dataKey="value"
                    innerRadius={42}
                    outerRadius={62}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="#2563eb" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className="text-lg font-bold text-text-primary">{selected.creditsAssigned.toLocaleString()}</p>
                <p className="text-[9px] text-text-muted">Total Assigned</p>
              </div>
            </div>
            <div className="flex justify-around mt-2 text-[10px]">
              <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-600 mr-1" />Used <span className="font-semibold">{selected.creditsUsed.toLocaleString()}</span></span>
              <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 mr-1" />Remaining <span className="font-semibold">{(selected.creditsAssigned - selected.creditsUsed).toLocaleString()}</span></span>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-1">
            <h3 className="text-xs font-semibold text-text-primary mb-3">Usage Over Time</h3>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={VERIFICATION_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 11 }} />
                <Line type="monotone" dataKey="verifications" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-text-primary mb-3">Plan & Subscription</h3>
            <dl className="space-y-2 text-xs">
              <Row k="Current Plan" v={PLAN_LABELS[selected.plan]} />
              <Row k="Billing Cycle" v={selected.billingCycle} />
              <Row k="Renewal Date" v={selected.renewalDate} />
              <Row k="Credits Included" v={`${(selected.creditsAssigned / 1000).toFixed(0)}K / year`} />
              <Row k="Price" v={`₹${selected.price.toLocaleString()} / year`} />
            </dl>
            <Button variant="secondary" size="sm" className="w-full mt-3">Manage Plan</Button>
          </Card>
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-muted">{k}</dt>
      <dd className="font-semibold text-text-primary">{v}</dd>
    </div>
  );
}
