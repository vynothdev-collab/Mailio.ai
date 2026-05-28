"use client";

import { useState } from "react";
import { Download, FileText, Clock, FileSearch, CheckCircle, X, UserPlus, MoreHorizontal, Paperclip, ExternalLink } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import Avatar from "@/components/ui/Avatar";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { MOCK_TICKETS, type MockTicket, type TicketStatus } from "@/mocks/tickets";
import { PLAN_LABELS } from "@/constants";

const STATUS_TONE: Record<TicketStatus, "blue" | "amber" | "purple" | "green" | "gray"> = {
  "New": "blue",
  "Checking": "amber",
  "In Progress": "purple",
  "Waiting for User": "amber",
  "Completed": "green",
  "Closed": "gray",
};

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("7d");
  const [selectedId, setSelectedId] = useState(MOCK_TICKETS[0].id);
  const selected: MockTicket = MOCK_TICKETS.find((t) => t.id === selectedId) ?? MOCK_TICKETS[0];

  return (
    <div>
      <Tabs
        tabs={[{ key: "single", label: "Single User Tickets" }]}
        active="single"
        onChange={() => {}}
        actions={<DateRangeFilter value={period} onChange={setPeriod} className="w-44" />}
        className="mb-6"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="New Tickets" value="32" icon={FileText} accent="blue" delta={28} />
        <StatCard label="Checking" value="18" icon={FileSearch} accent="orange" delta={12.5} />
        <StatCard label="In Progress" value="45" icon={Clock} accent="purple" delta={15.4} />
        <StatCard label="Completed" value="128" icon={CheckCircle} accent="green" delta={22.7} />
        <StatCard label="Closed" value="76" icon={X} accent="red" delta={18.9} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Table */}
        <Card noPadding className="lg:col-span-7">
          <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="Search tickets by ID, user, subject..." className="flex-1 min-w-[200px]" />
            <div className="flex gap-2 flex-wrap">
              <Select value="" onChange={() => {}} placeholder="Status" options={[]} className="w-28" />
              <Select value="" onChange={() => {}} placeholder="Priority" options={[]} className="w-28" />
              <Select value="" onChange={() => {}} placeholder="Category" options={[]} className="w-28" />
              <Button variant="secondary" size="sm">Clear Filters</Button>
            </div>
          </div>
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  {["Ticket ID", "User", "Email", "Subject", "Category", "Priority", "Updated", "Status"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_TICKETS.map((t) => {
                  const isSelected = t.id === selectedId;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`border-t border-gray-50 cursor-pointer hover:bg-gray-50/60 ${isSelected ? "bg-primary-50/40" : ""}`}
                    >
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 font-mono text-xs text-text-primary">{t.id}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-text-secondary">{t.user}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-text-secondary text-xs">{t.email}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-text-primary text-xs">{t.subject}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-text-secondary text-xs">{t.category}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5"><StatusBadge label={t.priority} tone={t.priority === "High" ? "red" : t.priority === "Medium" ? "amber" : "gray"} /></td>
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-text-secondary text-[11px] whitespace-nowrap">{t.updated}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5"><StatusBadge label={t.status} tone={STATUS_TONE[t.status]} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-text-muted">Showing 1 to 10 of 156 tickets</p>
            <div className="flex gap-1">
              <button className="w-8 h-8 rounded-md bg-primary-600 text-white text-xs font-medium">1</button>
              <button className="w-8 h-8 rounded-md border border-gray-200 text-xs">2</button>
              <button className="w-8 h-8 rounded-md border border-gray-200 text-xs">3</button>
              <span className="px-2 text-text-muted text-xs flex items-center">...</span>
              <button className="w-8 h-8 rounded-md border border-gray-200 text-xs">16</button>
            </div>
          </div>
        </Card>

        {/* Ticket detail */}
        <Card noPadding className="lg:col-span-5 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-text-primary">Ticket # {selected.id}</h3>
                <StatusBadge label={selected.status} tone={STATUS_TONE[selected.status]} />
              </div>
              <button className="p-1.5 rounded hover:bg-gray-100"><MoreHorizontal className="w-4 h-4 text-text-muted" /></button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={selected.user} size="md" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">{selected.user}</p>
                <p className="text-xs text-text-muted">{selected.email}</p>
                <p className="text-[10px] text-text-muted">Member since {selected.memberSince} • Plan: {PLAN_LABELS[selected.plan]}</p>
              </div>
              <button className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View User Profile</button>
            </div>
            <div className="grid grid-cols-4 gap-3 text-xs border-t border-gray-100 pt-3">
              <div><p className="text-text-muted">Category</p><p className="font-semibold mt-0.5">{selected.category}</p></div>
              <div><p className="text-text-muted">Priority</p><div className="mt-0.5"><StatusBadge label={selected.priority} tone={selected.priority === "High" ? "red" : "amber"} /></div></div>
              <div><p className="text-text-muted">Created On</p><p className="font-semibold mt-0.5">{selected.created}</p></div>
              <div><p className="text-text-muted">Last Updated</p><p className="font-semibold mt-0.5">{selected.updated}</p></div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase mb-1.5">Subject</h4>
              <p className="text-sm font-medium text-text-primary">{selected.subject}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase mb-1.5">Description</h4>
              <p className="text-sm text-text-secondary leading-relaxed">{selected.description}</p>
            </div>
            {selected.attachments && selected.attachments.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-1.5">Attachments</h4>
                <div className="space-y-1.5">
                  {selected.attachments.map((a) => (
                    <div key={a.name} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-2"><Paperclip className="w-3.5 h-3.5 text-text-muted" /><span className="text-xs">{a.name}</span><span className="text-[10px] text-text-muted">{a.size}</span></div>
                      <button className="p-1 rounded hover:bg-gray-100"><Download className="w-3.5 h-3.5 text-text-muted" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conversation */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-text-primary">Conversation</h4>
              <button className="text-xs text-primary-600 font-medium hover:underline">Add Reply</button>
            </div>
            <div className="space-y-3">
              {selected.conversation.map((r) => (
                <div key={r.id} className="flex gap-2.5">
                  <Avatar name={r.sender} size="sm" />
                  <div className="flex-1 bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-text-primary">{r.sender} <span className="text-text-muted font-normal">({r.senderType})</span></p>
                      <p className="text-[10px] text-text-muted">{r.time}</p>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm"><UserPlus className="w-3.5 h-3.5 mr-1" />Assign Ticket</Button>
            <Button variant="secondary" size="sm">Update Status</Button>
            <Button variant="primary" size="sm"><CheckCircle className="w-3.5 h-3.5 mr-1" />Mark Completed</Button>
            <Button variant="danger" size="sm"><X className="w-3.5 h-3.5 mr-1" />Close Ticket</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
