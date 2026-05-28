"use client";

import { useState } from "react";
import { Send, Paperclip, Smile, Zap, MoreHorizontal, UserPlus, Clock, X, MessageSquare, CheckCircle } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { MOCK_CHATS, type MockChat, type ChatStatus } from "@/mocks/chats";
import { PLAN_LABELS, PLAN_COLORS } from "@/constants";

const STATUS_TONE: Record<ChatStatus, "blue" | "amber" | "green" | "gray" | "purple"> = {
  New: "blue",
  Open: "purple",
  Waiting: "amber",
  Replied: "green",
  Closed: "gray",
};

const FILTERS: Array<{ key: string; label: string; count: number }> = [
  { key: "all", label: "All", count: 25 },
  { key: "new", label: "New", count: 6 },
  { key: "open", label: "Open", count: 12 },
  { key: "waiting", label: "Waiting", count: 5 },
  { key: "closed", label: "Closed", count: 2 },
];

export default function LiveChatPage() {
  const [selectedId, setSelectedId] = useState(MOCK_CHATS[0].id);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("7d");
  const [reply, setReply] = useState("");

  const selected: MockChat = MOCK_CHATS.find((c) => c.id === selectedId) ?? MOCK_CHATS[0];

  return (
    <div>
      <Tabs
        tabs={[{ key: "single", label: "Single User Chats" }]}
        active="single"
        onChange={() => {}}
        actions={<DateRangeFilter value={period} onChange={setPeriod} className="w-44" />}
        className="mb-6"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Active Chats" value="18" icon={MessageSquare} accent="blue" delta={20} deltaLabel="vs yesterday" />
        <StatCard label="Waiting Chats" value="7" icon={Clock} accent="orange" delta={16.7} deltaLabel="vs yesterday" />
        <StatCard label="Replied Today" value="154" icon={CheckCircle} accent="green" delta={24.5} deltaLabel="vs yesterday" />
        <StatCard label="Avg Response Time" value="1m 42s" icon={Clock} accent="purple" delta={-18.3} deltaLabel="vs yesterday" />
      </div>

      {/* Chat inbox + detail + user info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[680px]">
        {/* List */}
        <Card noPadding className="lg:col-span-4 flex flex-col overflow-hidden h-[500px] lg:h-auto">
          <div className="p-2.5 sm:p-4 border-b border-gray-100">
            <h3 className="text-xs sm:text-sm font-semibold text-text-primary mb-2 sm:mb-3">Conversations</h3>
            <SearchInput value={search} onChange={setSearch} placeholder="Search conversations..." />
            <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-3 text-[10px] sm:text-xs overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`pb-1.5 sm:pb-2 whitespace-nowrap flex items-center gap-1 sm:gap-1.5 font-medium ${filter === f.key ? "text-primary-600 border-b-2 border-primary-600" : "text-text-muted hover:text-text-secondary"}`}
                >
                  {f.label}<span className={`px-1 sm:px-1.5 rounded ${filter === f.key ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-text-muted"}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {MOCK_CHATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-2 sm:p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-2 sm:gap-2.5 ${selectedId === c.id ? "bg-primary-50/40" : ""}`}
              >
                <Avatar name={c.userName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="text-[11px] sm:text-sm font-semibold text-text-primary truncate">{c.userName}</p>
                    <span className="text-[9px] sm:text-[10px] text-text-muted flex-shrink-0">{c.lastTime}</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-text-muted truncate mt-0.5">{c.lastMessage}</p>
                  <div className="mt-1"><StatusBadge label={c.status} tone={STATUS_TONE[c.status]} /></div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Chat detail */}
        <Card noPadding className="lg:col-span-5 flex flex-col overflow-hidden h-[600px] lg:h-auto">
          <div className="flex items-center justify-between p-2.5 sm:p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Avatar name={selected.userName} size="sm" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-text-primary">{selected.userName}</p>
                <p className="text-[10px] sm:text-[11px] text-text-muted">{selected.userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select className="text-xs px-2 py-1 border border-gray-200 rounded-md"><option>Active</option><option>Closed</option></select>
              <button className="p-1.5 rounded hover:bg-gray-100"><MoreHorizontal className="w-4 h-4 text-text-muted" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
            <p className="text-center text-[10px] text-text-muted">May 26, 2025</p>
            {selected.messages.map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.sender === "admin" ? "justify-end" : ""}`}>
                {m.sender === "user" && <Avatar name={selected.userName} size="xs" />}
                <div className={`max-w-[70%] ${m.sender === "admin" ? "bg-primary-50 text-text-primary" : "bg-white text-text-primary border border-gray-100"} rounded-xl px-3 py-2`}>
                  <p className="text-xs whitespace-pre-line">{m.text}</p>
                  <p className="text-[10px] text-text-muted mt-1 text-right">{m.time}{m.sender === "admin" ? " ✓✓" : ""}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 sm:p-4 border-t border-gray-100">
            <div className="flex gap-2 sm:gap-3 mb-2 text-[10px] sm:text-xs">
              <button className="text-primary-600 font-semibold border-b-2 border-primary-600 pb-1">Reply</button>
              <button className="text-text-muted font-medium pb-1">Internal Note</button>
            </div>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              rows={2}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1">
                <button className="p-1.5 rounded hover:bg-gray-100"><Smile className="w-4 h-4 text-text-muted" /></button>
                <button className="p-1.5 rounded hover:bg-gray-100"><Paperclip className="w-4 h-4 text-text-muted" /></button>
                <button className="p-1.5 rounded hover:bg-gray-100"><Zap className="w-4 h-4 text-text-muted" /></button>
              </div>
              <Button variant="primary" size="sm"><Send className="w-3.5 h-3.5 mr-1.5" />Send Reply</Button>
            </div>
          </div>
        </Card>

        {/* User info + actions */}
        <Card noPadding className="lg:col-span-3 flex flex-col overflow-y-auto lg:h-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">User Details</h3>
            <dl className="space-y-2 text-xs">
              <Row k="Name" v={selected.userName} />
              <Row k="Email" v={selected.userEmail} />
              <Row k="Plan" v={<span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PLAN_COLORS[selected.plan]}`}>{PLAN_LABELS[selected.plan]}</span>} />
              <Row k="Member Since" v={selected.memberSince} />
              <Row k="Last Seen" v="10:24 AM" />
              <Row k="Total Conversations" v="7" />
            </dl>
          </div>

          <div className="p-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Chat Details</h3>
            <dl className="space-y-2 text-xs">
              <Row k="Chat ID" v={`#${selected.id}`} />
              <Row k="Status" v={<StatusBadge label={selected.status} tone={STATUS_TONE[selected.status]} />} />
              <Row k="Assigned To" v={selected.assignedTo} />
              <Row k="Started At" v={selected.startedAt} />
              <Row k="Source" v={selected.source} />
            </dl>
          </div>

          <div className="p-4 border-t border-gray-100 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Actions</h3>
            <Button variant="primary" className="w-full justify-center"><Send className="w-3.5 h-3.5 mr-1.5" />Reply</Button>
            <Button variant="secondary" className="w-full justify-center"><UserPlus className="w-3.5 h-3.5 mr-1.5" />Assign to Another Admin</Button>
            <Button variant="secondary" className="w-full justify-center"><Clock className="w-3.5 h-3.5 mr-1.5" />Mark as Waiting</Button>
            <Button variant="danger" className="w-full justify-center"><X className="w-3.5 h-3.5 mr-1.5" />Close Chat</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-muted">{k}</dt>
      <dd className="font-medium text-text-primary text-right">{v}</dd>
    </div>
  );
}
