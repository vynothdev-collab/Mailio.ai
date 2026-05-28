"use client";

import { useMemo, useState } from "react";
import { Plus, Download, Filter, Users, UserCheck, UserPlus, CalendarClock, KeyRound, Coins, Eye, UserX } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import ActionDropdown from "@/components/ui/ActionDropdown";
import Drawer from "@/components/ui/Drawer";
import { MOCK_USERS, type MockUser } from "@/mocks/users";
import { PLAN_COLORS, PLAN_LABELS } from "@/constants";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);

  const filtered = useMemo(() => {
    return MOCK_USERS.filter((u) => {
      if (search && !`${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (planFilter && u.plan !== planFilter) return false;
      if (statusFilter && u.status !== statusFilter) return false;
      return true;
    });
  }, [search, planFilter, statusFilter, expiryFilter]);

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Button variant="secondary" size="md"><Download className="w-4 h-4 mr-1.5" />Export</Button>
            <Button variant="primary" size="md"><Plus className="w-4 h-4 mr-1.5" />Add User</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Total Single Users" value="12,458" icon={Users} accent="blue" delta={14.8} deltaLabel="vs last week" />
        <StatCard label="Active Users" value="8,932" icon={UserCheck} accent="green" delta={8.7} deltaLabel="vs last week" />
        <StatCard label="New Users Today" value="32" icon={UserPlus} accent="purple" delta={18.6} deltaLabel="vs yesterday" />
        <StatCard label="Expiring Soon" value="58" icon={CalendarClock} accent="orange" delta={7.3} deltaLabel="Within 7 days" />
      </div>

      <Card className="p-2.5 sm:p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-2 sm:gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." className="col-span-2 md:col-span-4" />
          <Select value={planFilter} onChange={setPlanFilter} placeholder="All Plans" className="col-span-1 md:col-span-2" options={[
            { value: "FREE", label: "Free" }, { value: "BASIC", label: "Basic" }, { value: "PRO", label: "Pro" }, { value: "BUSINESS", label: "Business" }
          ]} />
          <Select value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses" className="col-span-1 md:col-span-2" options={[
            { value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }, { value: "Expiring Soon", label: "Expiring Soon" }
          ]} />
          <Select value={expiryFilter} onChange={setExpiryFilter} placeholder="Expiry Date" className="col-span-1 md:col-span-2" options={[
            { value: "7d", label: "Next 7 days" }, { value: "30d", label: "Next 30 days" }, { value: "expired", label: "Expired" }
          ]} />
          <Button variant="secondary" size="sm" className="col-span-1 md:col-span-2 justify-center"><Filter className="w-3.5 h-3.5 mr-1" />More Filters</Button>
        </div>
      </Card>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["User", "Email", "Plan", "Credits Used", "Credits Remaining", "Status", "Last Active", "Expiry Date", "Permissions", "Actions"].map((h) => (
                  <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer"
                  onClick={() => setSelectedUser(u)}
                >
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} size="sm" />
                      <p className="font-medium text-text-primary whitespace-nowrap">{u.name}</p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap">{u.email}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PLAN_COLORS[u.plan]}`}>{PLAN_LABELS[u.plan]}</span></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">{u.creditsUsed.toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">{u.creditsRemaining.toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <StatusBadge label={u.status} tone={u.status === "Active" ? "green" : u.status === "Expiring Soon" ? "amber" : "red"} />
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap text-xs">{u.lastActive}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap text-xs">
                    {u.expiryDate}
                    {u.expiryInDays !== null && <p className="text-text-muted text-[10px]">In {u.expiryInDays} days</p>}
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><StatusBadge label={u.role} tone={u.role === "Admin" ? "blue" : "gray"} /></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                    <ActionDropdown
                      actions={[
                        { label: "View Profile", onClick: () => setSelectedUser(u) },
                        { label: "Assign Credits", onClick: () => {} },
                        { label: "Reset Password", onClick: () => {} },
                        { label: "Update Status", onClick: () => {} },
                        { label: "Delete User", onClick: () => {}, danger: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-text-muted">Showing 1 to {filtered.length} of 12,458 users</p>
          <div className="flex gap-1">
            <button className="w-8 h-8 rounded-md bg-primary-600 text-white text-xs font-medium">1</button>
            <button className="w-8 h-8 rounded-md border border-gray-200 text-xs hover:bg-gray-50">2</button>
            <button className="w-8 h-8 rounded-md border border-gray-200 text-xs hover:bg-gray-50">3</button>
            <span className="px-2 text-text-muted text-xs flex items-center">...</span>
            <button className="w-12 h-8 rounded-md border border-gray-200 text-xs hover:bg-gray-50">1,246</button>
          </div>
        </div>
      </Card>

      <UserDetailDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}

function UserDetailDrawer({ user, onClose }: { user: MockUser | null; onClose: () => void }) {
  if (!user) return null;
  return (
    <Drawer
      open={!!user}
      onClose={onClose}
      title="User Profile"
      width="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1"><KeyRound className="w-4 h-4 mr-1.5" />Reset Password</Button>
          <Button variant="secondary" className="flex-1"><Coins className="w-4 h-4 mr-1.5" />Assign Credits</Button>
          <Button variant="danger"><UserX className="w-4 h-4 mr-1.5" />Deactivate</Button>
        </div>
      }
    >
      <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
        <Avatar name={user.name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary">{user.name}</h2>
            <StatusBadge label={user.status} tone={user.status === "Active" ? "green" : "amber"} />
          </div>
          <p className="text-sm text-text-muted mt-0.5">{user.email}</p>
          <p className="text-xs text-text-muted mt-0.5">User ID: {user.id}</p>
        </div>
      </div>

      <div className="py-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Plan & Subscription</h3>
          <button className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1"><Eye className="w-3 h-3" />View Plan Details</button>
        </div>
        <dl className="space-y-2.5 text-sm">
          <Row k="Plan" v={<span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PLAN_COLORS[user.plan]}`}>{PLAN_LABELS[user.plan]}</span>} />
          <Row k="Status" v={<StatusBadge label={user.status} tone="green" />} />
          <Row k="Expiry Date" v={<>{user.expiryDate} <span className="text-text-muted text-xs">(In {user.expiryInDays} days)</span></>} />
        </dl>
      </div>

      <div className="py-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Credit Summary</h3>
        <dl className="space-y-2.5 text-sm">
          <Row k="Total Credits" v={<strong>{user.totalCredits.toLocaleString()}</strong>} />
          <Row k="Credits Used" v={user.creditsUsed.toLocaleString()} />
          <Row k="Credits Remaining" v={<strong>{user.creditsRemaining.toLocaleString()}</strong>} />
        </dl>
        <div className="mt-3">
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-primary-600" style={{ width: `${(user.creditsUsed / user.totalCredits) * 100}%` }} />
          </div>
          <p className="text-xs text-text-muted mt-1.5 text-right">{Math.round((user.creditsUsed / user.totalCredits) * 1000) / 10}% used</p>
        </div>
      </div>
    </Drawer>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-muted">{k}</dt>
      <dd className="font-medium text-text-primary">{v}</dd>
    </div>
  );
}
