"use client";

import { useState } from "react";
import {
  Plus, Search, Filter, ChevronRight, ChevronLeft,
  ArrowLeft, MoreHorizontal, Clock, Calendar, Loader2,
  Paperclip, Send, X, TrendingUp, User, Download, FileText,
} from "lucide-react";
import { toast } from "sonner";

type Status   = "Open" | "Pending" | "Closed";
type Priority = "High" | "Medium" | "Low";

type ThreadMsg = {
  role: "user" | "support";
  label: string;
  note?: string;
  text: string;
  time: string;
  avatar: string;
};

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: Status;
  priority: Priority;
  updated: string;
  created: string;
  updatedAt: string;
  description: string;
  hasAttachment: boolean;
  thread: ThreadMsg[];
}

const TICKETS: Ticket[] = [
  {
    id: "TK-2467", subject: "Bulk verification stuck at 0%",         category: "Bulk Verification",
    status: "Open",    priority: "High",   updated: "2h ago",
    created: "May 15, 2024 · 2:15 PM", updatedAt: "May 15, 2024 · 4:25 PM",
    description: "I uploaded a CSV file (12,500 emails) for bulk verification but the job is stuck at 0% for over an hour. I've tried re-uploading the file and using a different browser, but the issue persists.",
    hasAttachment: true,
    thread: [
      { role: "user",    label: "You created this ticket",   text: "I uploaded a CSV file (12,500 emails) for bulk verification but the job is stuck at 0%…", time: "May 15, 2024 · 2:15 PM", avatar: "DA" },
      { role: "support", label: "Support Agent replied",     note: "Internal note", text: "Hi, thanks for reaching out. We're looking into this issue. Could you please share the job ID?", time: "May 15, 2024 · 3:02 PM", avatar: "SA" },
      { role: "user",    label: "You replied",               text: "Sure, the job ID is 8f3c9a2b-7e11-4d2a-9c8b-3f2e1d0a9b77.", time: "May 15, 2024 · 3:15 PM", avatar: "DA" },
    ],
  },
  {
    id: "TK-2459", subject: "Unable to upload CSV file",              category: "Bulk Verification",
    status: "Pending", priority: "Medium", updated: "1d ago",
    created: "May 14, 2024 · 11:30 AM", updatedAt: "May 14, 2024 · 2:00 PM",
    description: "Every time I try to upload a CSV file larger than 5 MB, I get a network error. Smaller files upload fine.",
    hasAttachment: false,
    thread: [
      { role: "user",    label: "You created this ticket", text: "Every time I try to upload a CSV file larger than 5 MB, I get a network error…", time: "May 14, 2024 · 11:30 AM", avatar: "DA" },
      { role: "support", label: "Support Agent replied",   text: "Hi! We're aware of an issue with large file uploads and our team is working on a fix. We'll update you shortly.", time: "May 14, 2024 · 2:00 PM", avatar: "SA" },
    ],
  },
  {
    id: "TK-2441", subject: "Billing question about plan upgrade",    category: "Billing",
    status: "Closed",  priority: "Low",    updated: "3d ago",
    created: "May 12, 2024 · 9:00 AM", updatedAt: "May 12, 2024 · 10:15 AM",
    description: "I want to upgrade from PRO to ULTIMATE mid-cycle. Will I be charged a prorated amount?",
    hasAttachment: false,
    thread: [
      { role: "user",    label: "You created this ticket", text: "I want to upgrade from PRO to ULTIMATE mid-cycle. Will I be charged a prorated amount?", time: "May 12, 2024 · 9:00 AM", avatar: "DA" },
      { role: "support", label: "Support Agent replied",   text: "Yes! Upgrades are prorated. You'll only be charged for the remaining days in your billing cycle. The new limits apply immediately.", time: "May 12, 2024 · 10:15 AM", avatar: "SA" },
    ],
  },
  {
    id: "TK-2438", subject: "API key not working",                    category: "API",
    status: "Open",    priority: "High",   updated: "5d ago",
    created: "May 10, 2024 · 4:45 PM", updatedAt: "May 10, 2024 · 5:00 PM",
    description: "I regenerated my API key in Settings but the new key keeps returning a 401 Unauthorized error on POST /v1/verify.",
    hasAttachment: false,
    thread: [
      { role: "user",    label: "You created this ticket", text: "My new API key keeps returning 401 Unauthorized on POST /v1/verify.", time: "May 10, 2024 · 4:45 PM", avatar: "DA" },
      { role: "support", label: "Support Agent replied",   text: "Thanks for the report. This may be a propagation delay. Could you try again in 5 minutes? We're also investigating on our end.", time: "May 10, 2024 · 5:00 PM", avatar: "SA" },
    ],
  },
  {
    id: "TK-2422", subject: "Need help understanding results",        category: "Bulk Verification",
    status: "Closed",  priority: "Medium", updated: "1w ago",
    created: "May 6, 2024 · 1:00 PM", updatedAt: "May 6, 2024 · 2:30 PM",
    description: "What does the CATCHALL status mean for emails in my bulk verification results?",
    hasAttachment: false,
    thread: [
      { role: "user",    label: "You created this ticket", text: "What does the CATCHALL status mean in my bulk results?", time: "May 6, 2024 · 1:00 PM", avatar: "DA" },
      { role: "support", label: "Support Agent replied",   text: "CATCHALL emails belong to catch-all domains. The server accepts all mail so the exact mailbox existence can't be confirmed. These are safe to send to but may have higher bounce rates.", time: "May 6, 2024 · 2:30 PM", avatar: "SA" },
    ],
  },
  {
    id: "TK-2410", subject: "Account access issue",                   category: "Account",
    status: "Closed",  priority: "Low",    updated: "1w ago",
    created: "May 4, 2024 · 10:00 AM", updatedAt: "May 4, 2024 · 10:30 AM",
    description: "I reset my password but still can't log in after the reset.",
    hasAttachment: false,
    thread: [
      { role: "user",    label: "You created this ticket", text: "I reset my password but still can't log in.", time: "May 4, 2024 · 10:00 AM", avatar: "DA" },
      { role: "support", label: "Support Agent replied",   text: "Try logging in via an incognito/private window to clear any cached session data. That should resolve the issue.", time: "May 4, 2024 · 10:30 AM", avatar: "SA" },
    ],
  },
  {
    id: "TK-2401", subject: "Delete my account",                      category: "Account",
    status: "Closed",  priority: "Low",    updated: "2w ago",
    created: "Apr 28, 2024 · 3:00 PM", updatedAt: "Apr 28, 2024 · 4:00 PM",
    description: "I would like to permanently delete my emailanswers.ai account and all associated data.",
    hasAttachment: false,
    thread: [
      { role: "user",    label: "You created this ticket", text: "I would like to permanently delete my emailanswers.ai account.", time: "Apr 28, 2024 · 3:00 PM", avatar: "DA" },
      { role: "support", label: "Support Agent replied",   text: "We've processed your account deletion request. Your account and all data will be permanently removed within 30 days per our data retention policy.", time: "Apr 28, 2024 · 4:00 PM", avatar: "SA" },
    ],
  },
];

const STATUS_STYLE: Record<Status, string> = {
  Open:    "border border-emerald-300 text-emerald-700 bg-emerald-50",
  Pending: "border border-amber-300 text-amber-700 bg-amber-50",
  Closed:  "bg-slate-100 text-slate-600 border border-slate-200",
};

const PRIORITY_DOT: Record<Priority, string> = {
  High:   "bg-red-500",
  Medium: "bg-amber-500",
  Low:    "bg-emerald-500",
};

type View = "list" | "detail" | "new";

const PAGE_SIZE = 7;

export function SubmitTicketSection() {
  const [tickets,  setTickets]  = useState<Ticket[]>(TICKETS);
  const [view,     setView]     = useState<View>("detail");
  const [selected, setSelected] = useState<string>(TICKETS[0].id);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [reply,    setReply]    = useState("");
  const [subject,  setSubject]  = useState("");
  const [category, setCategory] = useState("");
  const [message,  setMessage]  = useState("");
  const [saving,   setSaving]   = useState(false);

  const filtered = tickets.filter((t) =>
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeTicket = tickets.find((t) => t.id === selected) ?? null;

  function selectTicket(id: string) {
    setSelected(id);
    setView("detail");
    setReply("");
  }

  function sendReply() {
    const text = reply.trim();
    if (!text || !activeTicket) return;
    const time = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    setTickets((prev) => prev.map((t) =>
      t.id === activeTicket.id
        ? { ...t, thread: [...t.thread, { role: "user", label: "You replied", text, time, avatar: "DA" }] }
        : t
    ));
    setReply("");
  }

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    toast.success("Ticket submitted! We'll get back to you shortly.");
    setSubject(""); setCategory(""); setMessage("");
    setView("list");
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
      {/* Left: ticket list */}
      <div className="lg:w-[480px] xl:w-[520px] flex flex-col rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden" style={{ minHeight: 520 }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DCE6F3] px-4 sm:px-5 py-3 sm:py-4">
          <p className="text-sm font-bold text-[#111827]">Your Tickets</p>
          <button
            onClick={() => setView("new")}
            className="flex items-center gap-1.5 rounded-xl bg-[#0B47CF] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus size={13} /> New Ticket
          </button>
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-[#DCE6F3]">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search tickets..."
              className="w-full h-8 rounded-lg border border-[#DCE6F3] bg-[#F4F8FF]/60 pl-8 pr-3 text-xs text-[#111827] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/20"
            />
          </div>
          <button className="flex items-center gap-1.5 h-8 rounded-lg border border-[#DCE6F3] bg-white px-3 text-xs font-medium text-[#111827] hover:bg-[#F4F8FF] transition-colors">
            <Filter size={12} /> Filter
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_72px_64px] gap-2 px-4 sm:px-5 py-2 border-b border-[#DCE6F3] bg-[#F4F8FF]/40">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Subject</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Priority</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-0.5">
            Updated <ChevronRight size={9} className="rotate-90" />
          </p>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#DCE6F3]/60">
          {paged.map((t) => {
            const isActive = selected === t.id && view === "detail";
            return (
              <button
                key={t.id}
                onClick={() => selectTicket(t.id)}
                className={`w-full grid grid-cols-[1fr_80px_72px_64px] gap-2 items-center px-4 sm:px-5 py-3 text-left transition-colors
                  ${isActive ? "bg-[#EEF3FB]" : "hover:bg-[#F4F8FF]"}`}
              >
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? "text-[#0B47CF]" : "text-[#111827]"}`}>{t.subject}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">#{t.id}</p>
                </div>
                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status]}`}>
                  {t.status}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                  <span className="text-[11px] text-[#111827]">{t.priority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{t.updated}</span>
                  <ChevronRight size={12} className="text-muted-foreground shrink-0" />
                </div>
              </button>
            );
          })}
          {paged.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-xs text-muted-foreground">No tickets found.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="border-t border-[#DCE6F3] px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} tickets
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE6F3] text-muted-foreground hover:bg-[#F4F8FF] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium border transition-colors
                  ${page === p ? "bg-[#0B47CF] text-white border-[#0B47CF]" : "border-[#DCE6F3] text-[#111827] hover:bg-[#F4F8FF]"}`}
              >
                {p}
              </button>
            ))}
            {totalPages > 3 && <span className="text-xs text-muted-foreground">…</span>}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE6F3] text-muted-foreground hover:bg-[#F4F8FF] disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Right: detail / new ticket */}
      <div className="flex-1 rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 520 }}>

        {/* ── No selection ── */}
        {view === "list" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF3FB]">
              <FileText size={26} className="text-[#0B47CF]" />
            </div>
            <p className="text-sm font-semibold text-[#111827]">Select a ticket to view details</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">Click any ticket from the list to see the full thread and reply.</p>
          </div>
        )}

        {/* ── Ticket detail ── */}
        {view === "detail" && activeTicket && (
          <>
            {/* Detail header */}
            <div className="flex items-center gap-2 border-b border-[#DCE6F3] px-4 sm:px-5 py-3">
              <button onClick={() => setView("list")} className="text-xs text-[#0B47CF] flex items-center gap-1 hover:underline lg:hidden">
                <ArrowLeft size={13} /> Back
              </button>
              <button onClick={() => setView("list")} className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground hover:text-[#0B47CF] transition-colors">
                <ArrowLeft size={13} /> Back to tickets
              </button>
              <div className="flex-1" />
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[activeTicket.status]}`}>
                {activeTicket.status}
              </span>
              <span className="text-xs text-muted-foreground">Ticket #{activeTicket.id}</span>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#F4F8FF] transition-colors">
                <MoreHorizontal size={14} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
              {/* Title + dates */}
              <div>
                <h3 className="text-base font-bold text-[#111827]">{activeTicket.subject}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar size={11} /> Created {activeTicket.created}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock size={11} /> Updated {activeTicket.updatedAt}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-[#DCE6F3] bg-[#F4F8FF]/40 p-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Category</p>
                  <div className="flex items-center gap-1.5">
                    <FileText size={11} className="text-[#0B47CF]" />
                    <p className="text-xs font-medium text-[#111827]">{activeTicket.category}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Priority</p>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={11} className={activeTicket.priority === "High" ? "text-red-500" : activeTicket.priority === "Medium" ? "text-amber-500" : "text-emerald-500"} />
                    <p className={`text-xs font-semibold ${activeTicket.priority === "High" ? "text-red-600" : activeTicket.priority === "Medium" ? "text-amber-600" : "text-emerald-700"}`}>
                      {activeTicket.priority}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Related To</p>
                  <div className="flex items-center gap-1.5">
                    <User size={11} className="text-muted-foreground" />
                    <p className="text-xs text-[#111827] truncate">You</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-[#111827] mb-1.5">Description</p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{activeTicket.description}</p>
              </div>

              {/* Attachments */}
              {activeTicket.hasAttachment && (
                <div>
                  <p className="text-xs font-semibold text-[#111827] mb-1.5">Attachments (1)</p>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6F3] bg-[#F4F8FF]/60 px-3 py-2">
                    <FileText size={14} className="text-[#0B47CF]" />
                    <div>
                      <p className="text-xs font-medium text-[#111827]">bulk_upload.csv</p>
                      <p className="text-[10px] text-muted-foreground">12.4 KB</p>
                    </div>
                    <button className="ml-2 text-muted-foreground hover:text-[#0B47CF] transition-colors">
                      <Download size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Updates / thread */}
              <div>
                <p className="text-xs font-semibold text-[#111827] mb-3">Updates</p>
                <div className="space-y-4">
                  {activeTicket.thread.map((msg, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold ${msg.role === "support" ? "bg-[#0B47CF]" : "bg-slate-500"}`}>
                        {msg.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-xs font-semibold text-[#111827]">{msg.label}</p>
                          {msg.note && (
                            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{msg.note}</span>
                          )}
                          <p className="text-[10px] text-muted-foreground">{msg.time}</p>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reply input */}
            <div className="border-t border-[#DCE6F3] bg-white px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
              {activeTicket.status === "Closed" ? (
                <div className="flex-1 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">This ticket is closed.</p>
                  <button onClick={() => setView("new")} className="flex items-center gap-1.5 rounded-lg bg-[#0B47CF] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity">
                    <Plus size={12} /> New Ticket
                  </button>
                </div>
              ) : (
                <>
                  <button className="shrink-0 text-muted-foreground hover:text-[#0B47CF] transition-colors">
                    <Paperclip size={16} />
                  </button>
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    placeholder="Type your reply..."
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground text-[#111827] min-w-0"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!reply.trim()}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#0B47CF] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    <Send size={12} /> Send Reply
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* ── New ticket form ── */}
        {view === "new" && (
          <>
            <div className="flex items-center justify-between border-b border-[#DCE6F3] px-4 sm:px-5 py-3 sm:py-4">
              <p className="text-sm font-semibold text-[#111827]">New Support Ticket</p>
              <button onClick={() => setView(selected ? "detail" : "list")} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#111827]">Subject <span className="text-red-500">*</span></label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Describe your issue briefly"
                  className="w-full h-10 rounded-xl border border-[#DCE6F3] bg-[#F4F8FF]/60 px-3 text-sm text-[#111827] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#111827]">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#DCE6F3] bg-[#F4F8FF]/60 px-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/20"
                >
                  <option value="">Select a category</option>
                  <option>Billing</option>
                  <option>Credits</option>
                  <option>API</option>
                  <option>Bulk Verification</option>
                  <option>Account</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#111827]">Message <span className="text-red-500">*</span></label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail — include any error messages, job IDs, or steps to reproduce."
                  rows={6}
                  className="w-full rounded-xl border border-[#DCE6F3] bg-[#F4F8FF]/60 px-3 py-2.5 text-sm text-[#111827] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/20 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button onClick={() => setView(selected ? "detail" : "list")} className="h-9 px-4 rounded-xl border border-[#DCE6F3] text-xs font-medium text-[#111827] hover:bg-[#F4F8FF] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!subject.trim() || !message.trim() || saving}
                  className="h-9 px-5 flex items-center gap-2 rounded-xl bg-[#0B47CF] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {saving ? <><Loader2 size={12} className="animate-spin" /> Submitting…</> : "Submit Ticket"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
