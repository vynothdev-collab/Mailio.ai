"use client";

import { useState } from "react";
import { Download, Calendar, Eye } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import Tabs from "@/components/ui/Tabs";
import Drawer from "@/components/ui/Drawer";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import StatusBadge from "@/components/ui/StatusBadge";
import { MOCK_ACTIVITY_LOGS, type MockActivityLog } from "@/mocks/activity";

const TABS = [
  { key: "single", label: "Single Users" },
  { key: "enterprise", label: "Enterprises" },
];

export default function ActivityLogsPage() {
  const [tab, setTab] = useState("single");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("7d");
  const [actionFilter, setActionFilter] = useState("");
  const [selected, setSelected] = useState<MockActivityLog | null>(null);

  return (
    <div>
      <Tabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        actions={<DateRangeFilter value={period} onChange={setPeriod} className="w-44" />}
        className="mb-6"
      />

      <Card noPadding>
        <div className="grid grid-cols-2 md:grid-cols-12 gap-2 sm:gap-3 p-2.5 sm:p-4">
          <div className="col-span-2 md:col-span-3"><label className="block text-[10px] sm:text-xs text-text-muted mb-1">Date & Time</label><div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted flex-shrink-0" /><span className="truncate">May 20 — May 26, 2025</span></div></div>
          <div className="col-span-2 md:col-span-4"><label className="block text-[10px] sm:text-xs text-text-muted mb-1">User or Enterprise</label><SearchInput value={search} onChange={setSearch} placeholder="Search user or enterprise..." /></div>
          <div className="col-span-1 md:col-span-3"><label className="block text-[10px] sm:text-xs text-text-muted mb-1">Action</label><Select value={actionFilter} onChange={setActionFilter} placeholder="All Actions" options={[{ value: "login", label: "Logged In" }, { value: "update", label: "Updated" }, { value: "create", label: "Created" }]} /></div>
          <div className="col-span-1 md:col-span-2 flex items-end"><Button variant="secondary" size="sm" className="w-full justify-center"><Download className="w-3.5 h-3.5 mr-1" />Export</Button></div>
        </div>
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50/50">
                {["Date & Time", "User or Enterprise", "Action", "Module", "Details", "IP Address", ""].map((h) => (
                  <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_ACTIVITY_LOGS.map((l) => (
                <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs whitespace-nowrap">{l.dateTime}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">{l.user}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{l.action}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={l.module} tone="blue" /></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs">{l.details}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs font-mono">{l.ipAddress}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <button onClick={() => setSelected(l)} className="p-1.5 rounded hover:bg-gray-100"><Eye className="w-4 h-4 text-text-muted" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-text-muted">Showing 1 to 10 of 1,000 logs</p>
          <div className="flex gap-1">
            <button className="w-8 h-8 rounded-md bg-primary-600 text-white text-xs font-medium">1</button>
            <button className="w-8 h-8 rounded-md border border-gray-200 text-xs hover:bg-gray-50">2</button>
            <button className="w-8 h-8 rounded-md border border-gray-200 text-xs hover:bg-gray-50">3</button>
            <span className="px-2 text-text-muted text-xs flex items-center">...</span>
            <button className="w-10 h-8 rounded-md border border-gray-200 text-xs hover:bg-gray-50">100</button>
          </div>
        </div>
      </Card>

      {/* Details drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Activity Details" width="md">
        {selected && (
          <dl className="space-y-3 text-sm">
            <Row k="Date & Time" v={selected.dateTime} />
            <Row k="User" v={selected.user} />
            <Row k="Action" v={selected.action} />
            <Row k="Module" v={selected.module} />
            <Row k="Details" v={selected.details} />
            <Row k="IP Address" v={<span className="font-mono">{selected.ipAddress}</span>} />
            <Row k="Status" v={<StatusBadge label={selected.status} tone="green" />} />
          </dl>
        )}
      </Drawer>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <dt className="text-xs text-text-muted mb-1">{k}</dt>
      <dd className="font-medium text-text-primary">{v}</dd>
    </div>
  );
}
