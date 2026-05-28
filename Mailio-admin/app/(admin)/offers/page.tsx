"use client";

import { useState } from "react";
import { Plus, Download, Filter, Tag, Calendar, Clock, ShoppingCart, DollarSign, Pencil, MoreHorizontal } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import { MOCK_OFFERS, MOCK_ENTERPRISE_OFFERS } from "@/mocks/offers";
import { PROMO_PERFORMANCE } from "@/mocks/charts";

const TABS = [
  { key: "single", label: "Single User Offers" },
  { key: "enterprise", label: "Enterprise Offers" },
];

export default function OffersPage() {
  const [tab, setTab] = useState("single");
  const [search, setSearch] = useState("");

  return (
    <div>
      {/* Title rendered in global Header */}
      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-6" />

      {tab === "single" ? <SingleOffersView search={search} setSearch={setSearch} /> : <EnterpriseOffersView />}
    </div>
  );
}

function SingleOffersView({ search, setSearch }: { search: string; setSearch: (v: string) => void }) {
  const offers = MOCK_OFFERS.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Active Offers" value="12" icon={Tag} accent="green" delta={25} deltaLabel="vs last 30 days" />
          <StatCard label="Scheduled Offers" value="4" icon={Calendar} accent="blue" delta={0} deltaLabel="vs last 30 days" />
          <StatCard label="Expiring Soon" value="3" icon={Clock} accent="orange" sub="Within 7 days" />
          <StatCard label="Total Redemptions" value="2,450" icon={ShoppingCart} accent="purple" delta={18.6} />
          <StatCard label="Revenue Impact" value="₹1.25L" icon={DollarSign} accent="green" delta={22.3} className="col-span-2 sm:col-span-1" />
        </div>

        <Card noPadding>
          <div className="flex items-center justify-between p-4 gap-3 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="Search offers..." className="w-64" />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm"><Filter className="w-4 h-4 mr-1.5" />Filters</Button>
              <Button variant="secondary" size="sm"><Download className="w-4 h-4 mr-1.5" />Export</Button>
              <Button variant="primary" size="sm"><Plus className="w-4 h-4 mr-1.5" />Create Offer</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  {["Offer Name", "Promo Code", "Type", "Discount", "Applies To", "Start Date", "End Date", "Usage", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">{o.name}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary font-mono text-xs">{o.code}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{o.type}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">{o.discount}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{o.appliesTo}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs whitespace-nowrap">{o.startDate}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs whitespace-nowrap">{o.endDate}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary text-xs">{o.used.toLocaleString()} / {o.limit.toLocaleString()}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={o.status} tone={o.status === "Active" ? "green" : o.status === "Scheduled" ? "blue" : o.status === "Expired" ? "red" : "gray"} /></td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-3.5 h-3.5 text-text-muted" /></button>
                        <button className="p-1.5 rounded hover:bg-gray-100"><MoreHorizontal className="w-3.5 h-3.5 text-text-muted" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Promo Performance</h3>
            <span className="text-xs text-text-muted">Last 30 Days</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={PROMO_PERFORMANCE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="redemptions" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Redemptions" />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Revenue (₹)" />
              <Line type="monotone" dataKey="newUsers" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} name="New Users" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Create offer form */}
      <Card className="p-3 sm:p-5 lg:col-span-1 h-fit">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Create / Configure Offer</h3>
        <div className="space-y-3.5">
          <Field label="Offer Name *"><input className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="e.g. Summer Sale 2025" /></Field>
          <Field label="Promo Code *">
            <div className="flex gap-2">
              <input className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="e.g. SUMMER25" />
              <Button variant="secondary" size="sm">Generate</Button>
            </div>
          </Field>
          <Field label="Discount Type *"><select className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg"><option>Percentage</option><option>Fixed</option></select></Field>
          <Field label="Discount Value *">
            <div className="flex">
              <input className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-l-lg focus:outline-none" defaultValue="25" />
              <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-50 border border-l-0 border-gray-200 rounded-r-lg text-text-muted">%</span>
            </div>
          </Field>
          <Field label="Usage Limit (Optional)"><input className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg" defaultValue="500" /></Field>
          <Field label="Applies To *">
            <div className="flex gap-2 flex-wrap">
              <StatusBadge label="All Plans" tone="blue" />
              <StatusBadge label="All Users" tone="purple" />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date *"><input type="date" className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg" /></Field>
            <Field label="End Date *"><input type="date" className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg" /></Field>
          </div>
          <Field label="Status"><select className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg"><option>Active</option><option>Scheduled</option></select></Field>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1">Cancel</Button>
            <Button variant="primary" className="flex-1">Create Offer</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function EnterpriseOffersView() {
  return (
    <div className="space-y-6">
      <Card noPadding>
        <div className="flex items-center justify-between p-4">
          <h3 className="text-sm font-semibold text-text-primary">Enterprise Offer Rules & Promotions</h3>
          <Button variant="primary" size="sm"><Plus className="w-4 h-4 mr-1.5" />Create Enterprise Offer</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                {["Rule / Promotion", "Applies To", "Discount / Benefit", "Min Seats / Spend", "Start Date", "End Date", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_ENTERPRISE_OFFERS.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">{o.name}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{o.appliesTo}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">{o.discount}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{o.minSeats}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap text-xs">{o.startDate}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap text-xs">{o.endDate}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={o.status} tone={o.status === "Active" ? "green" : "blue"} /></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><div className="flex gap-1"><button className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-3.5 h-3.5 text-text-muted" /></button><button className="p-1.5 rounded hover:bg-gray-100"><MoreHorizontal className="w-3.5 h-3.5 text-text-muted" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-3 sm:p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Enterprise Benefits</h3>
        <ul className="space-y-2.5 text-sm">
          {["Custom pricing for large teams", "Dedicated account manager", "Priority support & onboarding", "Advanced security & compliance"].map((b) => (
            <li key={b} className="flex items-center gap-2 text-text-secondary">
              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-emerald-500" /></span>
              {b}
            </li>
          ))}
        </ul>
      </Card>
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
