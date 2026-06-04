"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, Building2, Check, ChevronDown, Eye, FileText,
  Filter as FilterIcon, Inbox, Loader2, MessageSquareReply, Search,
  Send, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import Avatar from "@/components/ui/Avatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminTicketsService,
  type AdminTicketDetail,
  type AdminTicketRow,
  type AdminTicketSort,
  type ListFilters,
  type TicketCreatorRole,
  type TicketPriority,
  type TicketStats,
  type TicketStatus,
  type TicketType,
} from "@/services/tickets.service";

// ─── Display maps ────────────────────────────────────────────────────────────

const STATUS_TONE: Record<TicketStatus, "blue" | "amber" | "purple" | "indigo" | "green" | "gray"> = {
  OPEN:              "blue",
  WAITING_FOR_ADMIN: "amber",
  WAITING_FOR_USER:  "purple",
  IN_PROGRESS:       "indigo",
  RESOLVED:          "green",
  CLOSED:            "gray",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN:              "Open",
  WAITING_FOR_ADMIN: "Needs Reply",
  WAITING_FOR_USER:  "Waiting User",
  IN_PROGRESS:       "In Progress",
  RESOLVED:          "Resolved",
  CLOSED:            "Closed",
};

const PRIORITY_TONE: Record<TicketPriority, "gray" | "blue" | "orange" | "red"> = {
  LOW:    "gray",
  MEDIUM: "blue",
  HIGH:   "orange",
  URGENT: "red",
};

const TYPE_LABEL: Record<TicketType, string> = {
  PAYMENT:            "Payment",
  CREDITS:            "Credits",
  TECHNICAL_ISSUE:    "Technical Issue",
  ACCOUNT:            "Account",
  BILLING:            "Billing",
  FEATURE_REQUEST:    "Feature Request",
  ENTERPRISE_SUPPORT: "Enterprise Support",
  GENERAL:            "General",
};

const USER_TYPE_LABEL: Record<TicketCreatorRole, string> = {
  USER:             "User",
  ENTERPRISE_USER:  "Enterprise User",
  ENTERPRISE_ADMIN: "Enterprise Admin",
};

const STATUS_OPTIONS    = (Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }));
const PRIORITY_OPTIONS  = (Object.keys(PRIORITY_TONE) as TicketPriority[]).map((p) => ({ value: p, label: p }));
const TYPE_OPTIONS      = (Object.keys(TYPE_LABEL) as TicketType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }));
const USER_TYPE_OPTIONS = (Object.keys(USER_TYPE_LABEL) as TicketCreatorRole[]).map((u) => ({ value: u, label: USER_TYPE_LABEL[u] }));

const SORT_OPTIONS: { value: AdminTicketSort; label: string }[] = [
  { value: "smart",    label: "Newest first" },
  { value: "latest",   label: "Latest updated" },
  { value: "oldest",   label: "Oldest first" },
  { value: "priority", label: "Priority HIGH → LOW" },
  { value: "unread",   label: "Unread first" },
  { value: "new",      label: "New tickets first" },
];

const QUICK_REPLIES = [
  "Thanks for reporting — we are checking this and will get back shortly.",
  "Could you share more details (steps to reproduce, screenshots, or IDs)?",
  "This issue has been resolved on our side. Please confirm at your end.",
];

const PAGE_SIZE = 10;

// ─── Format helpers ──────────────────────────────────────────────────────────

function fmtRel(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)         return "just now";
  if (diff < 3_600_000)      return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)     return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const [stats,   setStats]   = useState<TicketStats | null>(null);
  const [tickets, setTickets] = useState<AdminTicketRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);

  const [filters,    setFilters]    = useState<ListFilters>({ sortBy: "smart" });
  const [search,     setSearch]     = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [detail,        setDetail]        = useState<AdminTicketDetail | null>(null);
  const [loadingList,   setLoadingList]   = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError,     setListError]     = useState<string | null>(null);
  const [detailError,   setDetailError]   = useState<string | null>(null);

  const [reply,   setReply]   = useState("");
  const [sending, setSending] = useState(false);

  // Confirm dialog state — used for any destructive action (delete, etc).
  const [confirmState, setConfirmState] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    action: () => Promise<void>;
  }>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (p: number) => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await adminTicketsService.list({
        ...filters,
        search: search || undefined,
        page: p,
        limit: PAGE_SIZE,
      });
      setTickets(res.data);
      setTotal(res.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load tickets.";
      setListError(msg);
      toast.error(msg);
    } finally {
      setLoadingList(false);
    }
  }, [filters, search]);

  const refreshStats = useCallback(() => {
    adminTicketsService.stats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  useEffect(() => {
    setPage(1);
    void fetchList(1);
  }, [fetchList]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setLoadingDetail(true);
    setDetailError(null);
    adminTicketsService.detail(selectedId)
      .then(setDetail)
      .catch((e: unknown) => {
        setDetail(null);
        setDetailError(e instanceof Error ? e.message : "Failed to load ticket.");
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function syncAfterMutation() {
    if (selectedId) {
      const d = await adminTicketsService.detail(selectedId).catch(() => null);
      if (d) setDetail(d);
    }
    void fetchList(page);
    refreshStats();
  }

  async function changeStatus(status: TicketStatus) {
    if (!detail) return;
    try {
      await adminTicketsService.updateStatus(detail.ticket.id, status);
      toast.success(`Status → ${STATUS_LABEL[status]}`);
      await syncAfterMutation();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status update failed.");
    }
  }

  async function changePriority(priority: TicketPriority) {
    if (!detail) return;
    try {
      await adminTicketsService.updatePriority(detail.ticket.id, priority);
      toast.success(`Priority → ${priority}`);
      await syncAfterMutation();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Priority update failed.");
    }
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !detail) return;
    setSending(true);
    try {
      await adminTicketsService.reply(detail.ticket.id, text);
      setReply("");
      await syncAfterMutation();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  function deleteTicket() {
    if (!detail) return;
    const number = detail.ticket.ticketNumber;
    const id = detail.ticket.id;
    setConfirmState({
      title: "Delete ticket",
      message: `Ticket ${number} will be moved to the trash.`,
      confirmLabel: "Delete",
      danger: true,
      action: async () => {
        try {
          await adminTicketsService.remove(id);
          toast.success("Ticket deleted.");
          setDetail(null);
          setSelectedId(null);
          await fetchList(page);
          refreshStats();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Delete failed.");
          throw e;
        }
      },
    });
  }

  async function runConfirm() {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.action();
      setConfirmState(null);
    } catch {
      // action already showed its own error toast; just close the busy state.
    } finally {
      setConfirmBusy(false);
    }
  }

  function clearFilters() {
    setFilters({ sortBy: "smart" });
    setSearch("");
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.status)         n++;
    if (filters.priority)       n++;
    if (filters.type)           n++;
    if (filters.userType)       n++;
    if (filters.enterpriseOnly) n++;
    if (filters.unreadOnly)     n++;
    if (filters.dateFrom)       n++;
    if (filters.dateTo)         n++;
    return n;
  }, [filters]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 mb-4">
        <KpiCard label="Open"          value={stats?.open}            tone="bg-blue-50 text-blue-700" />
        <KpiCard label="Needs Reply"   value={stats?.needsReply}      tone="bg-amber-50 text-amber-700" />
        <KpiCard label="In Progress"   value={stats?.inProgress}      tone="bg-indigo-50 text-indigo-700" />
        <KpiCard label="Waiting User"  value={stats?.waitingForUser}  tone="bg-purple-50 text-purple-700" />
        <KpiCard label="Resolved"      value={stats?.resolved}        tone="bg-emerald-50 text-emerald-700" />
        <KpiCard label="Closed"        value={stats?.closed}          tone="bg-gray-100 text-gray-600" />
        <KpiCard label="High / Urgent" value={stats?.urgentHigh}      tone="bg-red-50 text-red-700"     icon={<AlertTriangle className="w-3 h-3" />} />
        <KpiCard label="Unread"        value={stats?.unread}          tone="bg-orange-50 text-orange-700" icon={<Eye className="w-3 h-3" />} />
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 mb-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket #, subject, requester name or email…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border text-xs font-semibold transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-gray-200 text-text-secondary hover:bg-gray-50"
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <SortButton
            value={filters.sortBy ?? "smart"}
            onChange={(v) => setFilters((p) => ({ ...p, sortBy: v }))}
          />

          {(activeFilterCount > 0 || search) && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 px-3 text-xs font-medium text-text-muted hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
            <FilterSelect label="Status"    value={filters.status ?? ""}    onChange={(v) => setFilters((p) => ({ ...p, status: (v || undefined) as TicketStatus | undefined }))} options={STATUS_OPTIONS} />
            <FilterSelect label="Priority"  value={filters.priority ?? ""}  onChange={(v) => setFilters((p) => ({ ...p, priority: (v || undefined) as TicketPriority | undefined }))} options={PRIORITY_OPTIONS} />
            <FilterSelect label="Type"      value={filters.type ?? ""}      onChange={(v) => setFilters((p) => ({ ...p, type: (v || undefined) as TicketType | undefined }))} options={TYPE_OPTIONS} />
            <FilterSelect label="User Type" value={filters.userType ?? ""}  onChange={(v) => setFilters((p) => ({ ...p, userType: (v || undefined) as TicketCreatorRole | undefined }))} options={USER_TYPE_OPTIONS} />

            <FilterDate label="From" value={filters.dateFrom ?? ""} onChange={(v) => setFilters((p) => ({ ...p, dateFrom: v || undefined }))} />
            <FilterDate label="To"   value={filters.dateTo ?? ""}   onChange={(v) => setFilters((p) => ({ ...p, dateTo: v || undefined }))} />

            <ToggleField label="Enterprise only" checked={!!filters.enterpriseOnly} onChange={(v) => setFilters((p) => ({ ...p, enterpriseOnly: v }))} />
            <ToggleField label="Unread only"     checked={!!filters.unreadOnly}     onChange={(v) => setFilters((p) => ({ ...p, unreadOnly: v }))} />
          </div>
        )}
      </div>

      {/* Helpdesk list */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          {loadingList ? (
            <SkeletonTable />
          ) : listError ? (
            <div className="p-12 text-center">
              <p className="text-xs text-red-600 mb-2">{listError}</p>
              <button onClick={() => fetchList(page)} className="text-xs text-primary-600 underline">Retry</button>
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState searched={activeFilterCount > 0 || !!search} />
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden md:table w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100">
                    <Th>Ticket</Th>
                    <Th>Subject</Th>
                    <Th>Requester</Th>
                    <Th>Type</Th>
                    <Th>Priority</Th>
                    <Th>Status</Th>
                    <Th>Last Activity</Th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <TicketTableRow
                      key={t.id}
                      ticket={t}
                      selected={t.id === selectedId}
                      onClick={() => setSelectedId(t.id)}
                    />
                  ))}
                </tbody>
              </table>
              {/* Mobile cards */}
              <ul className="md:hidden divide-y divide-gray-100">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <TicketCard ticket={t} onClick={() => setSelectedId(t.id)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {tickets.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-text-muted">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => { const np = page - 1; setPage(np); void fetchList(np); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => { const np = page + 1; setPage(np); void fetchList(np); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedId && (
        <Drawer onClose={() => setSelectedId(null)}>
          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>
          ) : detailError ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <p className="text-sm text-red-600 mb-2">{detailError}</p>
              <button onClick={() => { const id = selectedId; setSelectedId(null); setTimeout(() => setSelectedId(id), 0); }} className="text-xs text-primary-600 underline">Retry</button>
            </div>
          ) : detail ? (
            <TicketDetailView
              detail={detail}
              reply={reply}
              setReply={setReply}
              sending={sending}
              onSend={sendReply}
              onClose={() => setSelectedId(null)}
              onChangeStatus={changeStatus}
              onChangePriority={changePriority}
              onDelete={deleteTicket}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted">Ticket not found.</div>
          )}
        </Drawer>
      )}

      {/* Confirmation dialog (replaces native window.confirm) */}
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel={confirmState?.confirmLabel ?? "Confirm"}
        danger={confirmState?.danger ?? false}
        busy={confirmBusy}
        onConfirm={runConfirm}
        onCancel={() => { if (!confirmBusy) setConfirmState(null); }}
      />
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, tone, icon,
}: {
  label: string; value: number | undefined; tone: string; icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {icon}{label}
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-bold tabular-nums text-text-primary">
          {value ?? "—"}
        </span>
        <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${tone}`}>
          {label.split(" ")[0]}
        </span>
      </p>
    </div>
  );
}

// ─── Toolbar bits ────────────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      >
        <option value="">All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function FilterDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 h-9 mt-[18px] text-xs text-text-secondary cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      {label}
    </label>
  );
}

function SortButton({ value, onChange }: { value: AdminTicketSort; onChange: (v: AdminTicketSort) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((o) => o.value === value)!;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-gray-200 text-xs font-medium text-text-secondary hover:bg-gray-50"
      >
        Sort: {current.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-40 w-56 rounded-lg bg-white shadow-lg border border-gray-100 py-1">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex items-center justify-between w-full px-3 py-1.5 text-xs hover:bg-gray-50 ${
                  o.value === value ? "text-primary-600 font-semibold" : "text-text-secondary"
                }`}
              >
                {o.label}
                {o.value === value && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── List rows ───────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">
      {children}
    </th>
  );
}

function statusBarColor(t: AdminTicketRow): string {
  if (t.priority === "URGENT" || t.priority === "HIGH") return "bg-red-500";
  if (t.status === "WAITING_FOR_ADMIN")                 return "bg-amber-500";
  if (t.status === "RESOLVED" || t.status === "CLOSED") return "bg-emerald-500";
  return "bg-blue-500";
}

function TicketTableRow({
  ticket: t, selected, onClick,
}: { ticket: AdminTicketRow; selected: boolean; onClick: () => void }) {
  const unread = t.isUnreadForAdmin;
  return (
    <tr
      onClick={onClick}
      className={`relative cursor-pointer border-b border-gray-50 transition-colors ${
        selected ? "bg-primary-50/60"
                 : unread ? "bg-blue-50/60 hover:bg-blue-50/80"
                          : "hover:bg-gray-50/60"
      }`}
    >
      <td className="relative pl-3 sm:pl-4 py-3 pr-2 align-top">
        <span className={`absolute left-0 top-0 bottom-0 w-1 ${statusBarColor(t)}`} />
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] text-text-primary">{t.ticketNumber}</span>
          {t.isNewForAdmin && (
            <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold">NEW</span>
          )}
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 align-top">
        <div className="flex items-start gap-2">
          {unread && (
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
          )}
          <p className={`text-sm ${unread ? "font-bold text-text-primary" : "font-semibold text-text-primary"} truncate max-w-[320px]`}>
            {t.subject}
          </p>
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <Avatar name={t.requesterDisplayName} size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-primary truncate max-w-[160px]">{t.requesterDisplayName}</p>
            <p className="text-[10px] text-text-muted truncate max-w-[160px]">{t.requesterEmail}</p>
            <p className="text-[10px] mt-0.5 text-text-muted">
              {USER_TYPE_LABEL[t.requesterRole]}
              {t.enterpriseName && (
                <span className="inline-flex items-center gap-0.5 ml-1.5 text-indigo-600 font-medium">
                  <Building2 className="w-2.5 h-2.5" />{t.enterpriseName}
                </span>
              )}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 align-top text-xs text-text-secondary whitespace-nowrap">{TYPE_LABEL[t.type]}</td>
      <td className="px-3 sm:px-4 py-3 align-top"><StatusBadge label={t.priority} tone={PRIORITY_TONE[t.priority]} /></td>
      <td className="px-3 sm:px-4 py-3 align-top">
        <div className="flex flex-col gap-1">
          <StatusBadge label={STATUS_LABEL[t.status]} tone={STATUS_TONE[t.status]} dot />
          {t.needsAdminReply && (
            <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-semibold">
              Needs Reply
            </span>
          )}
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 align-top whitespace-nowrap">
        <div className="text-[11px] text-text-secondary">{fmtRel(t.lastMessageAt ?? t.updatedAt)}</div>
        <div className="text-[10px] text-text-muted">
          {t.lastMessageByRole === "SUPER_ADMIN" || t.lastMessageByRole === "ADMIN"
            ? "Support replied"
            : t.lastMessageByRole
              ? "User replied"
              : `Created ${fmtRel(t.createdAt)}`}
        </div>
      </td>
    </tr>
  );
}

function TicketCard({ ticket: t, onClick }: { ticket: AdminTicketRow; onClick: () => void }) {
  const unread = t.isUnreadForAdmin;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full text-left px-4 py-3 transition-colors ${
        unread ? "bg-blue-50/60" : "hover:bg-gray-50"
      }`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${statusBarColor(t)}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-text-muted">{t.ticketNumber}</span>
            {t.isNewForAdmin && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold">NEW</span>
            )}
          </div>
          <p className={`text-sm ${unread ? "font-bold" : "font-semibold"} text-text-primary truncate`}>{t.subject}</p>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">
            {t.requesterDisplayName} · {t.requesterEmail}
          </div>
        </div>
        <div className="text-[10px] text-text-muted whitespace-nowrap shrink-0">
          {fmtRel(t.lastMessageAt ?? t.updatedAt)}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <StatusBadge label={STATUS_LABEL[t.status]} tone={STATUS_TONE[t.status]} dot />
        <StatusBadge label={t.priority}             tone={PRIORITY_TONE[t.priority]} />
        <span className="text-[10px] text-text-muted">{TYPE_LABEL[t.type]}</span>
      </div>
    </button>
  );
}

function SkeletonTable() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-gray-50 grid grid-cols-12 gap-2 items-center">
          <div className="col-span-1 h-3 rounded bg-gray-100 animate-pulse" />
          <div className="col-span-4 h-3 rounded bg-gray-100 animate-pulse" />
          <div className="col-span-3 h-3 rounded bg-gray-100 animate-pulse" />
          <div className="col-span-2 h-3 rounded bg-gray-100 animate-pulse" />
          <div className="col-span-2 h-3 rounded bg-gray-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ searched }: { searched: boolean }) {
  return (
    <div className="p-16 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
        <Inbox className="w-6 h-6 text-text-muted" />
      </div>
      <p className="text-sm font-semibold text-text-primary">
        {searched ? "No tickets match your filters" : "No tickets yet"}
      </p>
      <p className="text-xs text-text-muted mt-1">
        {searched ? "Try widening the filters or clearing them." : "Tickets raised by users will appear here."}
      </p>
    </div>
  );
}

// ─── Detail drawer ───────────────────────────────────────────────────────────

function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full lg:max-w-3xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function TicketDetailView({
  detail, reply, setReply, sending, onSend, onClose,
  onChangeStatus, onChangePriority, onDelete,
}: {
  detail: AdminTicketDetail;
  reply: string;
  setReply: (s: string) => void;
  sending: boolean;
  onSend: () => void;
  onClose: () => void;
  onChangeStatus: (s: TicketStatus) => void;
  onChangePriority: (p: TicketPriority) => void;
  onDelete: () => void;
}) {
  const isClosed = detail.ticket.status === "CLOSED" || detail.ticket.status === "RESOLVED";
  const thread = detail.messages.slice(1); // first message mirrors ticket.content

  return (
    <>
      {/* Sticky header */}
      <header className="shrink-0 border-b border-gray-100 px-4 sm:px-6 py-4 flex items-start gap-3">
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 -ml-1 rounded hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 text-text-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-text-muted">{detail.ticket.ticketNumber}</span>
            <StatusBadge label={STATUS_LABEL[detail.ticket.status]} tone={STATUS_TONE[detail.ticket.status]} dot />
            <StatusBadge label={detail.ticket.priority} tone={PRIORITY_TONE[detail.ticket.priority]} />
            <span className="text-[11px] text-text-muted">{TYPE_LABEL[detail.ticket.type]}</span>
          </div>
          <h2 className="mt-1 text-base sm:text-lg font-bold text-text-primary leading-snug">
            {detail.ticket.subject}
          </h2>
          <div className="mt-1 text-[11px] text-text-muted flex items-center gap-1.5 flex-wrap">
            <span>Created {fmtDateTime(detail.ticket.createdAt)}</span>
            <span>·</span>
            <span>Updated {fmtRel(detail.ticket.lastMessageAt ?? detail.ticket.updatedAt)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hidden lg:flex p-1.5 rounded hover:bg-gray-100"
          title="Close"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </header>

      {/* Actions toolbar — always visible */}
      <div className="shrink-0 border-b border-gray-100 px-4 sm:px-6 py-3 bg-gray-50/40 flex flex-wrap items-center gap-2">
        <FieldPill label="Status">
          <select
            value={detail.ticket.status}
            onChange={(e) => onChangeStatus(e.target.value as TicketStatus)}
            className="bg-transparent text-xs font-semibold text-text-primary focus:outline-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldPill>
        <FieldPill label="Priority">
          <select
            value={detail.ticket.priority}
            onChange={(e) => onChangePriority(e.target.value as TicketPriority)}
            className="bg-transparent text-xs font-semibold text-text-primary focus:outline-none cursor-pointer"
          >
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldPill>

        <div className="flex-1 min-w-0" />

        <QuickStatusButton
          label="Mark In Progress"
          active={detail.ticket.status === "IN_PROGRESS"}
          onClick={() => onChangeStatus("IN_PROGRESS")}
        />
        <QuickStatusButton
          label="Waiting User"
          active={detail.ticket.status === "WAITING_FOR_USER"}
          onClick={() => onChangeStatus("WAITING_FOR_USER")}
        />
        <QuickStatusButton
          label="Resolve"
          active={detail.ticket.status === "RESOLVED"}
          onClick={() => onChangeStatus("RESOLVED")}
        />
        <QuickStatusButton
          label="Close"
          active={detail.ticket.status === "CLOSED"}
          onClick={() => onChangeStatus("CLOSED")}
        />
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 sm:px-6 py-5 space-y-5">

          {/* Requester card */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Requester</p>
            <div className="flex items-center gap-3">
              <Avatar name={detail.creator?.name ?? "?"} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {detail.creator?.name ?? "Unknown"}
                  {detail.creator?.deleted && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-red-50 border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">User deleted</span>
                  )}
                </p>
                <p className="text-xs text-text-muted truncate">{detail.creator?.email}</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {detail.creator && USER_TYPE_LABEL[detail.creator.role as TicketCreatorRole]}
                  {detail.enterprise && (
                    <span className="inline-flex items-center gap-0.5 ml-1.5 text-indigo-600 font-medium">
                      <Building2 className="w-3 h-3" />{detail.enterprise.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* Issue */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Original Issue</p>
              <p className="text-[10px] text-text-muted">{fmtDateTime(detail.ticket.createdAt)}</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{detail.ticket.content}</p>
          </section>

          {/* Activity timeline */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Activity</p>
            {thread.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs text-text-muted">
                No replies yet. Be the first to respond.
              </div>
            ) : (
              <ol className="relative ml-3 border-l-2 border-gray-100 space-y-4 pl-5">
                {thread.map((m) => {
                  const isAdmin = m.senderRole === "SUPER_ADMIN" || m.senderRole === "ADMIN";
                  return (
                    <li key={m.id} className="relative">
                      <span className={`absolute -left-[1.45rem] top-1 w-3 h-3 rounded-full border-2 ${isAdmin ? "bg-primary-500 border-primary-200" : "bg-gray-400 border-gray-200"}`} />
                      <div className="rounded-xl border border-gray-200 bg-white p-3.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-text-primary">
                              {m.senderName}
                            </p>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              isAdmin ? "bg-primary-50 text-primary-700" : "bg-gray-100 text-gray-600"
                            }`}>
                              {isAdmin ? "Support Team" : "Requester"}
                            </span>
                          </div>
                          <span className="text-[10px] text-text-muted">{fmtDateTime(m.createdAt)}</span>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{m.message}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* Reply editor */}
      {isClosed ? (
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50/40 flex items-center justify-between gap-3">
          <p className="text-xs text-text-muted">
            This ticket is {STATUS_LABEL[detail.ticket.status].toLowerCase()}.
          </p>
          <button
            type="button"
            onClick={() => onChangeStatus("OPEN")}
            className="text-xs text-primary-600 font-medium hover:underline"
          >
            Reopen
          </button>
        </div>
      ) : (
        <div className="shrink-0 border-t border-gray-100 p-3 sm:p-4 bg-white space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setReply(q)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] text-text-secondary hover:bg-white"
              >
                <MessageSquareReply className="w-3 h-3" />
                {q.length > 36 ? q.slice(0, 36) + "…" : q}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Type your reply…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!reply.trim() || sending}
              className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Send Reply</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FieldPill({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-secondary bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
      <span className="text-text-muted">{label}:</span>
      {children}
    </label>
  );
}

function QuickStatusButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
        active
          ? "bg-primary-600 text-white"
          : "bg-white border border-gray-200 text-text-secondary hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

// Mark unused icon import to satisfy lint
void FileText;
