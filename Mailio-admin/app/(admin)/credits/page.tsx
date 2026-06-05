"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Plus, TrendingUp, Loader2 } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import AsyncCombobox, { type ComboboxItem } from "@/components/ui/AsyncCombobox";
import {
  creditsService,
  type CreditLedgerEntry,
  type CreditSummary,
  type AccountType,
} from "@/services/credits.service";
import { adminUsersExtService } from "@/services/users.service";
import { enterprisesService } from "@/services/enterprises.service";

const PAGE_SIZE = 10;

const TABS = [
  { key: "USER",       label: "Single Users" },
  { key: "ENTERPRISE", label: "Enterprise" },
];

export default function CreditsPage() {
  const [tab, setTab] = useState<AccountType>("USER");
  const [allocOpen, setAllocOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-text-primary">Credits &amp; Usage</h1>
        <Button variant="primary" onClick={() => setAllocOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Credits
        </Button>
      </div>

      <Tabs
        tabs={TABS}
        active={tab}
        onChange={(k) => setTab(k as AccountType)}
        className="mb-6"
      />

      <div className="space-y-6">
        <KpiRow accountType={tab} />
        <LedgerCard accountType={tab} />
      </div>

      <AllocateModal
        open={allocOpen}
        accountType={tab}
        onClose={() => setAllocOpen(false)}
        onDone={() => {
          setAllocOpen(false);
          window.dispatchEvent(new CustomEvent("credits:refresh", { detail: { accountType: tab } }));
        }}
      />
    </div>
  );
}

// ─── Allocate modal — content depends on the active tab ─────────────────────

function AllocateModal({
  open,
  accountType,
  onClose,
  onDone,
}: {
  open: boolean;
  accountType: AccountType;
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<ComboboxItem | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reset state every time the modal opens or the tab changes.
  useEffect(() => {
    if (open) {
      setSelected(null);
      setAmount("");
      setDescription("");
      setErr(null);
    }
  }, [open, accountType]);

  const userFetcher = useCallback(async (q: string) => {
    const res = await adminUsersExtService.list({
      search: q || undefined,
      role: "USER",
      page: 1,
      limit: 8,
    });
    return res.data.map<ComboboxItem>((u) => ({
      id: u.id,
      primary: u.name,
      secondary: u.email,
      hint: u.plan,
    }));
  }, []);

  const enterpriseFetcher = useCallback(async (q: string) => {
    const res = await enterprisesService.list({
      search: q || undefined,
      page: 1,
      limit: 8,
    });
    return res.data.map<ComboboxItem>((e) => ({
      id: e.id,
      primary: e.name,
      secondary: e.domain ?? undefined,
      hint: e.isActive ? "Active" : "Inactive",
    }));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!selected) {
      setErr(accountType === "USER" ? "Search and pick a user." : "Search and pick an enterprise.");
      return;
    }
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Amount must be a positive integer.");
      return;
    }
    setSubmitting(true);
    try {
      if (accountType === "USER") {
        await creditsService.allocateUser({
          userId: selected.id,
          amount: n,
          description: description.trim() || undefined,
        });
      } else {
        await creditsService.allocateEnterprise({
          enterpriseId: selected.id,
          amount: n,
          description: description.trim() || undefined,
        });
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Allocation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      bodyOverflowVisible
      title={accountType === "USER" ? "Allocate Credits to a User" : "Allocate Credits to an Enterprise"}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            {accountType === "USER" ? "User" : "Enterprise"}
          </label>
          <AsyncCombobox
            value={selected}
            onChange={setSelected}
            fetcher={accountType === "USER" ? userFetcher : enterpriseFetcher}
            placeholder={
              accountType === "USER"
                ? "Search by name or email…"
                : "Search by enterprise name, domain, or admin email…"
            }
            emptyText={accountType === "USER" ? "No users found" : "No enterprises found"}
          />
          <p className="mt-1 text-[11px] text-text-muted">
            {accountType === "USER"
              ? "Only single users (role USER) are listed. Enterprise members are managed under the Enterprise tab."
              : "Pick an enterprise — allocated credits go into the enterprise pool."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Note (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {err && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Allocating…</> : "Allocate Credits"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── KPI row — only the stats relevant to the current tab ───────────────────

function KpiRow({ accountType }: { accountType: AccountType }) {
  const [summary, setSummary] = useState<CreditSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      creditsService.summary().then((s) => { if (!cancelled) setSummary(s); }).catch(() => {});
    };
    load();
    const onRefresh = () => load();
    window.addEventListener("credits:refresh", onRefresh as EventListener);
    return () => { cancelled = true; window.removeEventListener("credits:refresh", onRefresh as EventListener); };
  }, []);

  const block = accountType === "USER" ? summary?.users : summary?.enterprises;
  const label = accountType === "USER" ? "Users" : "Enterprises";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <StatCard
        label={`${label} — Outstanding`}
        value={(block?.outstandingBalance ?? 0).toLocaleString()}
        icon={Coins}
        accent="blue"
      />
      <StatCard
        label={`${label} — Lifetime Used`}
        value={(block?.lifetimeUsed ?? 0).toLocaleString()}
        icon={TrendingUp}
        accent="purple"
      />
    </div>
  );
}

// ─── Ledger card (filtered by accountType) ──────────────────────────────────

function LedgerCard({ accountType }: { accountType: AccountType }) {
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchLedger = useCallback(async (p: number) => {
    setLoading(true);
    setErr(null);
    try {
      const l = await creditsService.ledger({
        accountType,
        page: p,
        limit: PAGE_SIZE,
      });
      setLedger(l.data);
      setTotal(l.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load ledger.");
    } finally {
      setLoading(false);
    }
  }, [accountType]);

  useEffect(() => {
    setPage(1);
    void fetchLedger(1);
  }, [fetchLedger]);

  useEffect(() => {
    const onRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail as { accountType?: AccountType } | undefined;
      if (!detail?.accountType || detail.accountType === accountType) {
        setPage(1);
        void fetchLedger(1);
      }
    };
    window.addEventListener("credits:refresh", onRefresh as EventListener);
    return () => window.removeEventListener("credits:refresh", onRefresh as EventListener);
  }, [accountType, fetchLedger]);

  return (
    <Card noPadding>
      <div className="flex items-center justify-between p-4">
        <h3 className="text-sm font-semibold text-text-primary">
          {accountType === "USER" ? "User" : "Enterprise"} Credit Ledger
          {!loading && total > 0 && (
            <span className="ml-2 text-xs font-normal text-text-muted">
              {total.toLocaleString()} transactions
            </span>
          )}
        </h3>
      </div>

      {err ? (
        <div className="p-6 text-sm text-red-600">{err}</div>
      ) : loading ? (
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
              <div className="h-3 w-32 rounded bg-gray-100 shrink-0" />
              <div className="h-3 w-24 rounded bg-gray-100" />
              <div className="h-3 w-20 rounded bg-gray-100" />
              <div className="h-3 w-16 rounded bg-gray-100 ml-auto" />
            </div>
          ))}
        </div>
      ) : ledger.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">
          No credit transactions yet.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  {["When", "Account", "Type", "Reason", "Delta", "Balance After", "Reference", "Description"].map((h) => (
                    <th
                      key={h}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary">
                      <span className="font-medium">{row.accountType}</span>
                      <div className="text-[10px] text-text-muted font-mono">{row.accountId.slice(0, 8)}…</div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{row.type}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{row.reason}</td>
                    <td className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold tabular-nums ${row.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {row.delta >= 0 ? "+" : ""}{row.delta.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium tabular-nums">
                      {row.balanceAfter.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-[11px] text-text-muted">
                      {row.referenceType ? `${row.referenceType}:${row.referenceId?.slice(0, 8) ?? ""}…` : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary max-w-xs truncate">
                      {row.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={(p) => { setPage(p); void fetchLedger(p); }} />
        </>
      )}
    </Card>
  );
}

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1 && total <= pageSize) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | "…")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-text-muted">
      <span>Showing {start}–{end} of {total.toLocaleString()} transactions</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-primary hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        {pageNums.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p as number)}
              className={`min-w-[32px] px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                page === p
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 text-text-primary hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-primary hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
