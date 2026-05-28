"use client";

import { useState } from "react";
import { Calendar, Download, Filter } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import Tabs from "@/components/ui/Tabs";
import { MOCK_USERS } from "@/mocks/users";
import { MOCK_ENTERPRISES } from "@/mocks/enterprises";
import { PLAN_LABELS } from "@/constants";

const TABS = [
  { key: "single", label: "Single Users" },
  { key: "enterprise", label: "Enterprises" },
];

export default function ExpiryPage() {
  const [tab, setTab] = useState("single");
  const [search, setSearch] = useState("");

  return (
    <div>
      {/* Title rendered in global Header */}
      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-6" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Expiring Today" value="5" icon={Calendar} accent="blue" delta={25} deltaLabel="vs yesterday" />
        <StatCard label="Expiring in 7 Days" value="18" icon={Calendar} accent="orange" delta={-10} deltaLabel="vs last 7 days" />
        <StatCard label="Expiring in 30 Days" value="45" icon={Calendar} accent="purple" delta={-5} deltaLabel="vs last 30 days" />
        <StatCard label="Expired" value="2" icon={Calendar} accent="red" delta={33} deltaLabel="vs yesterday" />
      </div>

      <Card noPadding>
        <div className="flex items-center justify-between p-4 gap-3 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." className="flex-1 max-w-md" />
          <div className="flex gap-2 flex-wrap">
            <Select value="" onChange={() => {}} placeholder="All Plans" options={[]} className="w-32" />
            <Select value="" onChange={() => {}} placeholder="All Status" options={[]} className="w-32" />
            <Select value="" onChange={() => {}} placeholder="All Expiry" options={[]} className="w-32" />
            <Button variant="secondary" size="sm"><Filter className="w-4 h-4 mr-1.5" />Filters</Button>
            <Button variant="secondary" size="sm"><Download className="w-4 h-4 mr-1.5" />Export</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                {[tab === "single" ? "User" : "Enterprise", "Plan", "Plan Expiry", "Status", "Action"].map((h) => (
                  <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tab === "single"
                ? MOCK_USERS.filter((u) => u.expiryInDays !== null).map((u) => {
                    const days = u.expiryInDays!;
                    const tone = days <= 0 ? "red" : days <= 7 ? "amber" : days <= 30 ? "purple" : "green";
                    const label = days <= 0 ? "Expired" : days === 0 ? "Expiring Today" : days <= 7 ? `Expiring in ${days} days` : days <= 30 ? `Expiring in ${days} days` : "Active";
                    return (
                      <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                        <td className="px-3 sm:px-4 py-2 sm:py-3"><div className="flex items-center gap-2.5"><Avatar name={u.name} size="sm" /><div><p className="font-medium text-text-primary">{u.name}</p><p className="text-[11px] text-text-muted">{u.email}</p></div></div></td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{PLAN_LABELS[u.plan]} <StatusBadge label="Single User" tone="sky" /></td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3"><p className="text-sm">{u.expiryDate}</p><p className="text-[11px] text-text-muted">{days > 0 ? `In ${days} days` : "Today"}</p></td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={label} tone={tone} /></td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3"><Button variant="secondary" size="sm">Notify</Button></td>
                      </tr>
                    );
                  })
                : MOCK_ENTERPRISES.map((e) => {
                    const tone = e.status === "Expiring Soon" ? "amber" : e.status === "Expired" ? "red" : "green";
                    return (
                      <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                        <td className="px-3 sm:px-4 py-2 sm:py-3"><div className="flex items-center gap-2.5"><Avatar name={e.name} size="sm" /><div><p className="font-medium text-text-primary">{e.name}</p><p className="text-[11px] text-text-muted">{e.adminEmail}</p></div></div></td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{PLAN_LABELS[e.plan]} <StatusBadge label="Enterprise" tone="purple" /></td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3"><p className="text-sm">{e.renewalDate}</p></td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={e.status} tone={tone} /></td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3"><Button variant="secondary" size="sm">Notify</Button></td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
