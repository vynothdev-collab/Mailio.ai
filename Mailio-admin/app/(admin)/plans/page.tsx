"use client";

import { useState } from "react";
import { Plus, Copy, Archive, Pencil, Star, FileText, CheckCheck, Building2, ClipboardList, CalendarClock } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import { MOCK_SINGLE_PLANS, MOCK_ENTERPRISE_PLANS, type MockPlan } from "@/mocks/plans";

const TABS = [
  { key: "single", label: "Single User Plans" },
  { key: "enterprise", label: "Enterprise Plans" },
];

export default function PlansPage() {
  const [tab, setTab] = useState("single");
  const [selected, setSelected] = useState<MockPlan>(MOCK_SINGLE_PLANS[0]);

  const plans = tab === "single" ? MOCK_SINGLE_PLANS : MOCK_ENTERPRISE_PLANS;

  return (
    <div>
      <Tabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        actions={<Button variant="primary" size="sm"><Plus className="w-4 h-4 mr-1.5" />Create Plan</Button>}
        className="mb-6"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Total Plans" value="18" icon={ClipboardList} accent="purple" sub="All single-user and enterprise plans" />
        <StatCard label="Active Plans" value="15" icon={CheckCheck} accent="green" sub="83.3% of total plans" />
        <StatCard label="Enterprise Plans" value="7" icon={Building2} accent="blue" sub="38.9% of total plans" />
        <StatCard label="Plans Expiring Soon" value="3" icon={CalendarClock} accent="orange" sub="Within next 30 days" />
      </div>

      <Card noPadding className="mb-6">
        <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <SearchInput value="" onChange={() => {}} placeholder="Search plans by name..." className="flex-1" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value="" onChange={() => {}} placeholder="All Types" options={[{ value: "single", label: "Single User" }, { value: "ent", label: "Enterprise" }]} className="w-32" />
            <Select value="" onChange={() => {}} placeholder="All Status" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} className="w-32" />
            <Select value="" onChange={() => {}} placeholder="All Billing" options={[{ value: "m", label: "Monthly" }, { value: "y", label: "Yearly" }]} className="w-32" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                {["Plan Name", "Type", "Price", "Credits", "Validity", "Users", "Billing", "Status", "Updated", "Actions"].map((h) => (
                  <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer ${p.id === selected.id ? "bg-primary-50/40" : ""}`}
                >
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-2">
                      {p.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                      <span className="font-medium text-text-primary">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={p.type} tone={p.type === "Enterprise" ? "purple" : "blue"} /></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">{p.currency}{p.price.toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{p.credits.toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{p.validityDays} Days</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{p.usersIncluded}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{p.billingCycle}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={p.status} tone={p.status === "Active" ? "green" : "red"} /></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap text-xs">{p.updated}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-3.5 h-3.5 text-text-muted" /></button>
                      <button className="p-1.5 rounded hover:bg-gray-100"><Copy className="w-3.5 h-3.5 text-text-muted" /></button>
                      <button className="p-1.5 rounded hover:bg-gray-100"><Archive className="w-3.5 h-3.5 text-text-muted" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Plan detail */}
      <Card className="p-3 sm:p-5">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary">{selected.name}</h3>
                <StatusBadge label={selected.status} tone={selected.status === "Active" ? "green" : "red"} />
              </div>
              <p className="text-xs text-text-muted mt-0.5">{selected.type} Plan • Last updated {selected.updated}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm"><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit Plan</Button>
            <Button variant="secondary" size="sm"><Copy className="w-3.5 h-3.5 mr-1.5" />Duplicate</Button>
            <Button variant="danger" size="sm"><Archive className="w-3.5 h-3.5 mr-1.5" />Archive</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <h4 className="text-xs font-semibold text-text-primary mb-3">Plan Details</h4>
            <dl className="space-y-2 text-sm">
              <Row k="Monthly Price" v={`${selected.currency}${selected.price.toLocaleString()}`} />
              <Row k="Credits Included" v={selected.credits.toLocaleString()} />
              <Row k="Validity" v={`${selected.validityDays} Days`} />
              <Row k="Users Included" v={selected.usersIncluded.toString()} />
              <Row k="Billing Cycle" v={selected.billingCycle} />
              <Row k="Plan ID" v={selected.id} />
            </dl>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-primary mb-3">Plan Features</h4>
            <ul className="space-y-2 text-sm">
              {selected.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-text-secondary">
                  <CheckCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-primary mb-3">Linked Offers & Promotions</h4>
            <div className="space-y-2">
              {["SUMMER25 — 25% OFF", "WELCOME10 — 10% OFF", "PROUPGRADE — ₹100 OFF"].map((o) => (
                <div key={o} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg">
                  <span className="text-xs text-text-secondary">{o}</span>
                  <StatusBadge label="Active" tone="green" />
                </div>
              ))}
            </div>
          </div>
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
