"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import Tabs from "@/components/ui/Tabs";
import {
  subscriptionExpiryService,
  type ExpiryBucket,
  type ExpiryListResponse,
  type ExpiryPlan,
  type ExpiryRow,
  type ExpirySummary,
  type ExpiryTab,
} from "@/services/subscription-expiry.service";

const TABS = [
  { key: "single",     label: "Single Users"  },
  { key: "enterprise", label: "Enterprises" },
];

const BUCKET_OPTIONS: { value: ExpiryBucket | ""; label: string }[] = [
  { value: "",        label: "All Expiry"       },
  { value: "EXPIRED", label: "Expired"          },
  { value: "TODAY",   label: "Expiring Today"   },
  { value: "WEEK",    label: "Expiring in 7 d"  },
  { value: "MONTH",   label: "Expiring in 30 d" },
  { value: "ACTIVE",  label: "Active (>30 d)"   },
];

const PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function bucketBadge(row: ExpiryRow): { label: string; tone: "red" | "amber" | "purple" | "green" | "gray" } {
  const d = row.daysRemaining;
  if (row.bucket === "EXPIRED" || d < 0)     return { label: "Expired",            tone: "red"    };
  if (row.bucket === "TODAY")                return { label: "Expiring Today",     tone: "red"    };
  if (row.bucket === "WEEK")                 return { label: `Expiring in ${Math.max(d, 0)} d`, tone: "amber"  };
  if (row.bucket === "MONTH")                return { label: `Expiring in ${d} d`, tone: "purple" };
  return                                            { label: "Active",             tone: "green"  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ExpiryPage() {
  const [tab,    setTab]    = useState<ExpiryTab>("single");

  const [search,         setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter,     setPlanFilter]     = useState<string>("");
  const [bucketFilter,   setBucketFilter]   = useState<ExpiryBucket | "">("");

  const [page,    setPage]    = useState(1);
  const [list,    setList]    = useState<ExpiryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [summary,  setSummary]  = useState<ExpirySummary | null>(null);
  const [plans,    setPlans]    = useState<ExpiryPlan[]>([]);

  // Debounce search → 250ms after last keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever any filter changes (including tab).
  useEffect(() => { setPage(1); }, [tab, debouncedSearch, planFilter, bucketFilter]);

  // Reset filters when the tab changes (different plans / etc).
  useEffect(() => {
    setSearch(""); setPlanFilter(""); setBucketFilter("");
  }, [tab]);

  const fetchList = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search: debouncedSearch || undefined,
        planId: planFilter || undefined,
        bucket: (bucketFilter || undefined) as ExpiryBucket | undefined,
        page:   p,
        limit:  PAGE_SIZE,
      };
      const res = tab === "single"
        ? await subscriptionExpiryService.users(params)
        : await subscriptionExpiryService.enterprises(params);
      setList(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch, planFilter, bucketFilter]);

  // Re-fetch on every filter / page change.
  useEffect(() => { void fetchList(page); }, [fetchList, page]);

  // Summary + plans on tab switch.
  useEffect(() => {
    subscriptionExpiryService.summary(tab).then(setSummary).catch(() => setSummary(null));
    subscriptionExpiryService.plans(tab).then(setPlans).catch(() => setPlans([]));
  }, [tab]);

  const rows       = list?.data ?? [];
  const total      = list?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const planOptions = [
    { value: "", label: "All Plans" },
    ...plans.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div>
      <Tabs tabs={TABS} active={tab} onChange={(t) => setTab(t as ExpiryTab)} className="mb-6" />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Expiring Today"      value={summary?.expiringToday ?? "—"} icon={Calendar} accent="blue"   />
        <StatCard label="Expiring in 7 Days"  value={summary?.expiringIn7d  ?? "—"} icon={Calendar} accent="orange" />
        <StatCard label="Expiring in 30 Days" value={summary?.expiringIn30d ?? "—"} icon={Calendar} accent="purple" />
        <StatCard label="Expired"             value={summary?.expired       ?? "—"} icon={Calendar} accent="red"    />
      </div>

      <Card noPadding>
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 gap-3 flex-wrap">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={tab === "single" ? "Search by name or email…" : "Search by enterprise name…"}
            className="flex-1 max-w-md"
          />
          <div className="flex gap-2 flex-wrap">
            <Select
              value={planFilter}
              onChange={setPlanFilter}
              placeholder="All Plans"
              options={planOptions}
              className="w-40"
            />
            <Select
              value={bucketFilter}
              onChange={(v) => setBucketFilter(v as ExpiryBucket | "")}
              placeholder="All Expiry"
              options={BUCKET_OPTIONS}
              className="w-40"
            />
            {(search || planFilter || bucketFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setPlanFilter(""); setBucketFilter(""); }}
                className="text-xs text-text-muted hover:text-text-primary font-medium px-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50/60">
                {[
                  tab === "single" ? "User" : "Enterprise",
                  "Plan",
                  "Plan Expiry",
                  "Credits",
                  "Status",
                ].map((h) => (
                  <th key={h} className="px-3 sm:px-4 py-2.5 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-3 sm:px-4 py-3"><div className="h-3 rounded bg-gray-100 animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center">
                    <p className="text-xs text-red-600 mb-2">{error}</p>
                    <button onClick={() => fetchList(page)} className="text-xs text-primary-600 underline">Retry</button>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center">
                    <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-text-secondary">No subscriptions found</p>
                    <p className="text-xs text-text-muted mt-1">
                      {search || planFilter || bucketFilter
                        ? "Try widening your filters."
                        : "Nothing is approaching expiry yet."}
                    </p>
                  </td>
                </tr>
              ) : rows.map((row) => {
                const badge = bucketBadge(row);
                const used  = row.totalCredits > 0 ? Math.round((row.usedCredits / row.totalCredits) * 100) : 0;
                return (
                  <tr key={row.subscriptionId} className="border-t border-gray-50 hover:bg-gray-50/60">
                    <td className="px-3 sm:px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.accountName} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate max-w-[180px]">{row.accountName}</p>
                          {row.accountEmail && (
                            <p className="text-[11px] text-text-muted truncate max-w-[180px]">{row.accountEmail}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-text-secondary text-xs font-medium">{row.planName}</span>
                        <StatusBadge label={tab === "single" ? "Single User" : "Enterprise"} tone={tab === "single" ? "sky" : "purple"} />
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                      <p className="text-sm text-text-primary">{fmtDate(row.endDate)}</p>
                      <p className="text-[11px] text-text-muted">
                        {row.daysRemaining < 0
                          ? `${Math.abs(row.daysRemaining)} d ago`
                          : row.daysRemaining === 0
                            ? "Today"
                            : `In ${row.daysRemaining} d`}
                      </p>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap min-w-[140px]">
                      <p className="text-[11px] text-text-secondary tabular-nums">
                        {row.remainingCredits.toLocaleString()} / {row.totalCredits.toLocaleString()}
                      </p>
                      <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-primary-500"
                          style={{ width: `${Math.min(100, used)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5">
                      <StatusBadge label={badge.label} tone={badge.tone} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer + pagination */}
        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 gap-3 flex-wrap">
            <span className="text-[11px] text-text-muted">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-text-muted hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  aria-label="Previous page"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronLeft size={13} />}
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
                      <span key={`e${i}`} className="px-1 text-[11px] text-text-muted">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p as number)}
                        className={`flex h-7 min-w-[28px] px-2 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                          page === p
                            ? "bg-primary-600 text-white"
                            : "border border-gray-200 text-text-primary hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-text-muted hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
