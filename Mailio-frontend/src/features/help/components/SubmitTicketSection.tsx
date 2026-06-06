"use client";

/* eslint-disable react-hooks/set-state-in-effect -- intentional fetch-on-mount pattern */

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Search, ArrowLeft, Loader2, Send, X, FileText, Inbox,
  AlertCircle, Building2, Filter, Clock, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  ticketsService,
  type Ticket,
  type TicketAttachment as TicketAttachmentDto,
  type TicketStatus,
  type TicketType,
  type TicketWithThread,
} from "@/src/services/ticketsService";
import { TicketAttachmentInput } from "./TicketAttachmentInput";
import { TicketAttachmentsList } from "./TicketAttachmentsList";

// ─── Display maps ────────────────────────────────────────────────────────────

const STATUS_PILL: Record<TicketStatus, string> = {
  OPEN:              "bg-blue-50 text-blue-700 border border-blue-200",
  IN_PROGRESS:       "bg-indigo-50 text-indigo-700 border border-indigo-200",
  WAITING_FOR_USER:  "bg-purple-50 text-purple-700 border border-purple-200",
  WAITING_FOR_ADMIN: "bg-amber-50 text-amber-700 border border-amber-200",
  RESOLVED:          "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CLOSED:            "bg-slate-100 text-slate-600 border border-slate-200",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN:              "Open",
  IN_PROGRESS:       "In Progress",
  WAITING_FOR_USER:  "Awaiting You",
  WAITING_FOR_ADMIN: "With Support",
  RESOLVED:          "Resolved",
  CLOSED:            "Closed",
};

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: "BILLING",            label: "Billing Issue"      },
  { value: "CREDITS",            label: "Credit Issue"       },
  { value: "PAYMENT",            label: "Payment Issue"      },
  { value: "TECHNICAL_ISSUE",    label: "Technical Issue"    },
  { value: "ENTERPRISE_SUPPORT", label: "Enterprise Support" },
  { value: "ACCOUNT",            label: "Account Issue"      },
  { value: "FEATURE_REQUEST",    label: "Feature Request"    },
  { value: "GENERAL",            label: "General"            },
];

const TYPE_LABEL: Record<TicketType, string> = Object.fromEntries(
  TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<TicketType, string>;

const STATUS_FILTER_OPTIONS: { value: TicketStatus | ""; label: string }[] = [
  { value: "",                  label: "All statuses" },
  { value: "OPEN",              label: "Open" },
  { value: "WAITING_FOR_ADMIN", label: "With Support" },
  { value: "WAITING_FOR_USER",  label: "Awaiting You" },
  { value: "IN_PROGRESS",       label: "In Progress" },
  { value: "RESOLVED",          label: "Resolved" },
  { value: "CLOSED",            label: "Closed" },
];

const TYPE_FILTER_OPTIONS: { value: TicketType | ""; label: string }[] = [
  { value: "", label: "All types" },
  ...TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

function fmtRel(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)         return "just now";
  if (diff < 3_600_000)      return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)     return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

type View = "list" | "detail" | "new";

const PAGE_SIZE = 10;

export function SubmitTicketSection() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [view, setView] = useState<View>("list");

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [typeFilter,   setTypeFilter]   = useState<TicketType | "">("");
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [page,         setPage]         = useState(1);

  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [detail,        setDetail]        = useState<TicketWithThread | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [reply, setReply]     = useState("");
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  // New-ticket form
  const [title,   setTitle]   = useState("");
  const [subject, setSubject] = useState("");
  const [type,    setType]    = useState<TicketType | "">("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Server-side total used for pagination math + footer.
  const [total, setTotal] = useState(0);
  // Debounce search to avoid hammering the API on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters / search change.
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, typeFilter]);

  // ── Data ────────────────────────────────────────────────────────────────────
  const fetchList = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await ticketsService.listMine({
        status: statusFilter || undefined,
        type:   typeFilter   || undefined,
        search: debouncedSearch || undefined,
        page:   p,
        limit:  PAGE_SIZE,
      });
      setTickets(res.data);
      setTotal(res.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load tickets.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter]);

  // Refresh whenever the page or any filter changes.
  useEffect(() => { void fetchList(page); }, [fetchList, page]);

  // Lightweight wrapper for callers that just want to re-fetch the current page
  // (e.g. after creating a new ticket or sending a reply).
  const refreshList = useCallback(
    () => fetchList(page),
    [fetchList, page],
  );

  // Re-fetch the open ticket — used to refresh expired signed attachment URLs.
  const reloadDetail = useCallback(async () => {
    if (!selectedId) return;
    try {
      const d = await ticketsService.detail(selectedId);
      setDetail(d);
    } catch {/* ignore */}
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingDetail(true);
    ticketsService.detail(selectedId)
      .then((d) => {
        setDetail(d);
        // Refresh list to clear unread badge (backend resets userUnreadCount on open).
        void refreshList();
      })
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedId, refreshList]);

  // Clear detail when no ticket is selected (e.g. after Back).
  useEffect(() => {
    if (!selectedId) setDetail(null);
  }, [selectedId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp page if total shrinks below current page (e.g. user filters down).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  // The server already paged + filtered the result, so render `tickets` directly.
  const paged = tickets;

  // ── Actions ─────────────────────────────────────────────────────────────────
  function openDetail(id: string) {
    setSelectedId(id);
    setView("detail");
    setReply("");
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !detail) return;
    setSending(true);
    try {
      await ticketsService.reply(detail.ticket.id, text, replyAttachments);
      setReply("");
      setReplyAttachments([]);
      const fresh = await ticketsService.detail(detail.ticket.id);
      setDetail(fresh);
      await refreshList();
    } catch (e) {
      const apiMsg = (e as { message?: string } | null)?.message;
      toast.error(apiMsg || (e instanceof Error ? e.message : "Failed to send reply."));
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit() {
    setFormError(null);
    if (title.trim().length < 3)    { setFormError("Title is required (at least 3 characters)."); return; }
    if (!subject.trim())            { setFormError("Subject is required.");        return; }
    if (!type)                      { setFormError("Please pick a ticket type."); return; }
    if (message.trim().length < 10) { setFormError("Please describe your issue (at least 10 characters)."); return; }
    setSaving(true);
    try {
      const created = await ticketsService.create({
        title: title.trim(),
        subject: subject.trim(),
        type,
        content: message.trim(),
        attachments,
      });
      toast.success(`Ticket ${created.ticket.ticketNumber} submitted!`);
      setTitle(""); setSubject(""); setType(""); setMessage(""); setAttachments([]);
      await refreshList();
      openDetail(created.ticket.id);
    } catch (e) {
      // The api wrapper rejects with `{ status, message }`, not an Error
      // instance — pull the server-side message directly so the user can
      // see what actually failed (storage misconfig, MIME rejection, etc.).
      const apiMsg = (e as { message?: string } | null)?.message;
      const msg =
        apiMsg ||
        (e instanceof Error ? e.message : "Failed to create ticket.");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (view === "new") {
    return (
      <NewTicketForm
        title={title} subject={subject} type={type} message={message}
        attachments={attachments}
        saving={saving} formError={formError}
        onTitle={setTitle} onSubject={setSubject} onType={setType} onMessage={setMessage}
        onAttachments={setAttachments}
        onSubmit={handleSubmit}
        onCancel={() => { setView(selectedId ? "detail" : "list"); setFormError(null); }}
      />
    );
  }

  if (view === "detail" && selectedId) {
    return (
      <TicketDetail
        loading={loadingDetail}
        detail={detail}
        reply={reply}
        setReply={setReply}
        replyAttachments={replyAttachments}
        setReplyAttachments={setReplyAttachments}
        sending={sending}
        onSend={sendReply}
        onReload={reloadDetail}
        onBack={() => { setView("list"); setSelectedId(null); }}
        onNew={() => { setView("new"); setFormError(null); }}
      />
    );
  }

  const activeFilterCount = (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0);
  const hasAnyFilter = !!search || activeFilterCount > 0;

  // List view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-[#111827]">Support Tickets</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track your support requests and replies from our team.
          </p>
        </div>
        <button
          onClick={() => { setView("new"); setFormError(null); }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B47CF] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={14} /> New Ticket
        </button>
      </div>

      {/* Single card wrapping toolbar + list */}
      <div className="rounded-2xl border border-[#DCE6F3] bg-white overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-[#DCE6F3]/70 px-3 sm:px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ticket #, title, or subject…"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#DCE6F3] bg-[#F4F8FF]/60 text-sm text-[#111827] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                filtersOpen || activeFilterCount > 0
                  ? "border-[#0B47CF] bg-[#EEF3FB] text-[#0B47CF]"
                  : "border-[#DCE6F3] text-[#111827] hover:bg-[#F4F8FF]"
              }`}
            >
              <Filter size={13} /> Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#0B47CF] text-white text-[9px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {hasAnyFilter && (
              <button
                type="button"
                onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); }}
                className="hidden sm:inline-block h-10 px-2 text-xs font-medium text-muted-foreground hover:text-[#111827]"
              >
                Clear
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "")}
            className="h-9 rounded-md border border-[#DCE6F3] bg-white px-2 text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/30"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TicketType | "")}
            className="h-9 rounded-md border border-[#DCE6F3] bg-white px-2 text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/30"
          >
            {TYPE_FILTER_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
            </div>
          )}
        </div>

        {/* List */}
        <div>
          {loading ? (
            <SkeletonList />
          ) : error ? (
            <div className="py-12 text-center px-4">
              <p className="text-xs text-red-600 mb-2">{error}</p>
              <button onClick={() => void refreshList()} className="text-xs font-semibold text-[#0B47CF] hover:underline">
                Retry
              </button>
            </div>
          ) : paged.length === 0 ? (
            <EmptyList
              searched={hasAnyFilter}
              onCreate={() => { setView("new"); setFormError(null); }}
            />
          ) : (
            <ul className="divide-y divide-[#DCE6F3]/60">
              {paged.map((t) => <TicketCard key={t.id} ticket={t} onClick={() => openDetail(t.id)} />)}
            </ul>
          )}
        </div>

        {/* Footer + pagination */}
        {!loading && !error && total > 0 && (
          <div className="border-t border-[#DCE6F3]/70 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] text-muted-foreground">
              {`${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
              {hasAnyFilter && <> · filtered</>}
            </span>
            {totalPages > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE6F3] text-muted-foreground hover:bg-[#F4F8FF] disabled:opacity-40 transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={13} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`e${i}`} className="px-1 text-[11px] text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p as number)}
                        className={`flex h-7 min-w-[28px] px-2 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                          page === p
                            ? "bg-[#0B47CF] text-white"
                            : "border border-[#DCE6F3] text-[#111827] hover:bg-[#F4F8FF]"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE6F3] text-muted-foreground hover:bg-[#F4F8FF] disabled:opacity-40 transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                For instant help, use <strong className="text-[#0B47CF]">Live Chat</strong>.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <ul className="divide-y divide-[#DCE6F3]/60">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="px-4 py-4 space-y-2">
          <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
          <div className="h-2.5 w-1/2 rounded bg-slate-100 animate-pulse" />
          <div className="h-2.5 w-1/3 rounded bg-slate-100 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

function EmptyList({ searched, onCreate }: { searched: boolean; onCreate: () => void }) {
  return (
    <div className="py-14 text-center px-6">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-[#EEF3FB] flex items-center justify-center mb-3">
        <FileText size={20} className="text-[#0B47CF]" />
      </div>
      <p className="text-sm font-semibold text-[#111827]">
        {searched ? "No tickets match your filters" : "No tickets yet"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-[280px] mx-auto">
        {searched
          ? "Try clearing the search or status/type filters."
          : "No support tickets yet. Create your first ticket and our team will help you."}
      </p>
      {!searched && (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B47CF] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          <Plus size={13} /> New Ticket
        </button>
      )}
    </div>
  );
}

function TicketCard({ ticket: t, onClick }: { ticket: Ticket; onClick: () => void }) {
  const unread = t.userUnreadCount > 0;
  const lastReplyByMe =
    t.lastMessageByRole === "USER" ||
    t.lastMessageByRole === "ENTERPRISE_USER" ||
    t.lastMessageByRole === "ENTERPRISE_ADMIN";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`relative w-full text-left transition-colors ${
          unread ? "bg-blue-50/60 hover:bg-blue-50/80" : "hover:bg-[#F4F8FF]"
        }`}
      >
        <div className="px-4 sm:px-5 py-3.5">
          {/* Top row — meta + last activity */}
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-mono text-[10px] text-muted-foreground">#{t.ticketNumber}</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{TYPE_LABEL[t.type]}</span>
              {unread && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#0B47CF] text-white text-[9px] font-bold">
                  <AlertCircle size={9} /> New reply
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
              <Clock size={10} />
              {fmtRel(t.lastMessageAt ?? t.updatedAt)}
            </div>
          </div>

          {/* Title + Subject */}
          <p className={`text-sm ${unread ? "font-bold" : "font-semibold"} text-[#111827] truncate`}>
            {t.title}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{t.subject}</p>

          {/* Preview */}
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            {t.content}
          </p>

          {/* Bottom row — status / priority / last reply by */}
          <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[t.status]}`}>
                {STATUS_LABEL[t.status]}
              </span>
            </div>
            {t.lastMessageByRole && (
              <span className="text-[10px] text-muted-foreground">
                Last reply by{" "}
                <span className={`font-semibold ${lastReplyByMe ? "text-[#111827]" : "text-[#0B47CF]"}`}>
                  {lastReplyByMe ? "You" : "Support"}
                </span>
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

// ─── Ticket detail ──────────────────────────────────────────────────────────

function TicketDetail({
  loading, detail, reply, setReply, replyAttachments, setReplyAttachments,
  sending, onSend, onReload, onBack, onNew,
}: {
  loading: boolean;
  detail: TicketWithThread | null;
  reply: string;
  setReply: (s: string) => void;
  replyAttachments: File[];
  setReplyAttachments: (f: File[]) => void;
  sending: boolean;
  onSend: () => void;
  onReload: () => Promise<void>;
  onBack: () => void;
  onNew: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#DCE6F3] bg-white py-20 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="rounded-2xl border border-[#DCE6F3] bg-white p-12 text-center text-sm text-muted-foreground">
        Ticket not available.
        <div className="mt-3">
          <button onClick={onBack} className="text-xs text-[#0B47CF] underline">Back to list</button>
        </div>
      </div>
    );
  }

  const ticket = detail.ticket;
  const thread = detail.messages.slice(1); // skip first (mirrors content)
  const isClosed = ticket.status === "CLOSED" || ticket.status === "RESOLVED";

  return (
    <div className="space-y-3">
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-[#0B47CF] transition-colors"
      >
        <ArrowLeft size={13} /> Back to tickets
      </button>

      {/* One unified card with internal dividers */}
      <div className="rounded-2xl border border-[#DCE6F3] bg-white overflow-hidden">
        {/* Header */}
        <header className="px-4 sm:px-6 py-4 border-b border-[#DCE6F3]/70">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">#{ticket.ticketNumber}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[ticket.status]}`}>
              {STATUS_LABEL[ticket.status]}
            </span>
            <span className="text-[10px] text-muted-foreground">{TYPE_LABEL[ticket.type]}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#111827] leading-snug">
            {ticket.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.subject}</p>
          <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>Created {fmtDateTime(ticket.createdAt)}</span>
            <span>·</span>
            <span>Updated {fmtRel(ticket.lastMessageAt ?? ticket.updatedAt)}</span>
          </div>
        </header>

        {/* Original issue */}
        <section className="px-4 sm:px-6 py-4 border-b border-[#DCE6F3]/70">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={12} className="text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Original issue
            </p>
          </div>
          <p className="text-sm text-[#111827]/85 leading-relaxed whitespace-pre-wrap">
            {ticket.content}
          </p>
        </section>

        <TicketAttachmentsList
          attachments={detail.attachments ?? []}
          onRefresh={() => void onReload()}
        />

        {/* Activity timeline */}
        <section className="px-4 sm:px-6 py-4 border-b border-[#DCE6F3]/70">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Activity {thread.length > 0 && `· ${thread.length}`}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {thread.length === 0
                ? "Waiting for first reply"
                : ticket.lastMessageByRole === "ADMIN" || ticket.lastMessageByRole === "SUPER_ADMIN"
                  ? "Latest reply by Support"
                  : "Latest reply by You"}
            </span>
          </div>
          {thread.length === 0 ? (
            <div className="rounded-xl bg-[#F4F8FF]/60 border border-dashed border-[#DCE6F3] p-5 text-center">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-[#DCE6F3] mb-2">
                <Clock size={14} className="text-[#0B47CF]" />
              </div>
              <p className="text-sm font-semibold text-[#111827]">Our support team is on it</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                We typically reply within a few hours during business days.
              </p>
            </div>
          ) : (
            <ol className="relative ml-1.5 border-l-2 border-[#DCE6F3] space-y-3 pl-5">
              {thread.map((m) => {
                const isUser = m.senderRole === "USER" || m.senderRole === "ENTERPRISE_USER" || m.senderRole === "ENTERPRISE_ADMIN";
                return (
                  <li key={m.id} className="relative">
                    <span className={`absolute -left-[1.50rem] top-1.5 w-3 h-3 rounded-full border-2 ${
                      isUser ? "bg-slate-400 border-slate-200" : "bg-[#0B47CF] border-[#DCE6F3]"
                    }`} />
                    <div className="rounded-xl border border-[#DCE6F3] bg-white p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#111827]">
                            {isUser ? "You" : "Support"}
                          </p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            isUser ? "bg-slate-100 text-slate-600" : "bg-[#EEF3FB] text-[#0B47CF]"
                          }`}>
                            {isUser ? "You" : "Support Team"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{fmtDateTime(m.createdAt)}</span>
                      </div>
                      <p className="text-sm text-[#111827]/85 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Reply box */}
        {isClosed ? (
          <div className="px-4 sm:px-6 py-4 bg-[#F4F8FF]/40 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              This ticket is <span className="font-semibold text-[#111827]">{STATUS_LABEL[ticket.status].toLowerCase()}</span>.
              Need to follow up?
            </p>
            <button
              type="button"
              onClick={onNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B47CF] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus size={12} /> New Ticket
            </button>
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-4 space-y-2.5">
            <label htmlFor="ticket-reply" className="block text-xs font-semibold text-[#111827]">
              Add a reply
            </label>
            <TicketAttachmentInput
              files={replyAttachments}
              onFilesChange={setReplyAttachments}
              disabled={sending}
            >
              <textarea
                id="ticket-reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Type your reply… (drag, paste, or use + to attach)"
                className="w-full rounded-t-2xl bg-transparent px-3 py-2.5 text-sm text-[#111827] placeholder:text-muted-foreground focus:outline-none resize-none"
              />
            </TicketAttachmentInput>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-muted-foreground">
                For instant help, use <strong className="text-[#0B47CF]">Live Chat</strong>. For tracked issues, continue using this ticket.
              </p>
              <button
                type="button"
                onClick={onSend}
                disabled={!reply.trim() || sending}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0B47CF] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Send Reply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New ticket form ────────────────────────────────────────────────────────

function NewTicketForm({
  title, subject, type, message, attachments, saving, formError,
  onTitle, onSubject, onType, onMessage, onAttachments, onSubmit, onCancel,
}: {
  title: string;
  subject: string;
  type: TicketType | "";
  message: string;
  attachments: File[];
  saving: boolean;
  formError: string | null;
  onTitle: (s: string) => void;
  onSubject: (s: string) => void;
  onType: (t: TicketType | "") => void;
  onMessage: (s: string) => void;
  onAttachments: (files: File[]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#111827]">New Support Ticket</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Describe your issue and our team will respond as soon as possible.
          </p>
        </div>
        <button
          onClick={onCancel}
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="rounded-2xl border border-[#DCE6F3] bg-white p-4 sm:p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#111827]">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Short headline (e.g. Missing credits)"
            maxLength={120}
            className="w-full h-10 rounded-xl border border-[#DCE6F3] bg-[#F4F8FF]/60 px-3 text-sm text-[#111827] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/20"
          />
          <p className="text-[10px] text-muted-foreground text-right">{title.length}/120</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#111827]">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            value={subject}
            onChange={(e) => onSubject(e.target.value)}
            placeholder="Briefly describe your issue"
            maxLength={150}
            className="w-full h-10 rounded-xl border border-[#DCE6F3] bg-[#F4F8FF]/60 px-3 text-sm text-[#111827] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/20"
          />
          <p className="text-[10px] text-muted-foreground text-right">{subject.length}/150</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#111827]">
            Ticket Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((o) => {
              const selected = type === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onType(o.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-[#0B47CF] bg-[#EEF3FB] ring-1 ring-[#0B47CF]/30"
                      : "border-[#DCE6F3] bg-white hover:bg-[#F4F8FF]"
                  }`}
                >
                  <div className={`text-xs font-semibold ${selected ? "text-[#0B47CF]" : "text-[#111827]"}`}>
                    {o.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#111827]">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => onMessage(e.target.value)}
            placeholder="Include any error messages, steps to reproduce, or order/job IDs."
            rows={6}
            maxLength={5000}
            className="w-full rounded-xl border border-[#DCE6F3] bg-[#F4F8FF]/60 px-3 py-2.5 text-sm text-[#111827] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/20 resize-none"
          />
          <p className="text-[10px] text-muted-foreground text-right">{message.length}/5000</p>
        </div>

        <TicketAttachmentInput
          variant="attachOnly"
          files={attachments}
          onFilesChange={onAttachments}
          disabled={saving}
        />

        {formError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {formError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE6F3]/60">
          <button
            onClick={onCancel}
            type="button"
            className="h-9 px-4 rounded-xl border border-[#DCE6F3] text-xs font-medium text-[#111827] hover:bg-[#F4F8FF] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            type="button"
            disabled={!title.trim() || !subject.trim() || !message.trim() || !type || saving}
            className="h-9 px-5 flex items-center gap-2 rounded-xl bg-[#0B47CF] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? <><Loader2 size={12} className="animate-spin" /> Submitting…</> : "Submit Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

void Inbox; void Building2;
