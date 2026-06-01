"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Plus, TrendingUp, X } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  creditsService,
  type CreditLedgerEntry,
  type CreditSummary,
  type AccountType,
} from "@/services/credits.service";

export default function CreditsPage() {
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [filter, setFilter] = useState<"" | AccountType>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [allocOpen, setAllocOpen] = useState<null | "user" | "enterprise">(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [s, l] = await Promise.all([
        creditsService.summary(),
        creditsService.ledger({
          accountType: filter || undefined,
          limit: 100,
        }),
      ]);
      setSummary(s);
      setLedger(l.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load credits data.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Credits</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Allocate and audit credits. Only Super Admins can write here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setAllocOpen("user")}>
            <Plus className="w-4 h-4 mr-1.5" />
            Allocate to User
          </Button>
          <Button variant="primary" onClick={() => setAllocOpen("enterprise")}>
            <Plus className="w-4 h-4 mr-1.5" />
            Allocate to Enterprise
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Users — Outstanding"
          value={(summary?.users.outstandingBalance ?? 0).toLocaleString()}
          icon={Coins}
          accent="blue"
        />
        <StatCard
          label="Users — Lifetime Used"
          value={(summary?.users.lifetimeUsed ?? 0).toLocaleString()}
          icon={TrendingUp}
          accent="purple"
        />
        <StatCard
          label="Enterprises — Outstanding"
          value={(summary?.enterprises.outstandingBalance ?? 0).toLocaleString()}
          icon={Coins}
          accent="green"
        />
        <StatCard
          label="Enterprises — Lifetime Used"
          value={(summary?.enterprises.lifetimeUsed ?? 0).toLocaleString()}
          icon={TrendingUp}
          accent="orange"
        />
      </div>

      <Card noPadding>
        <div className="flex items-center justify-between p-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Credit Ledger
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <button
              className={`px-2.5 py-1 rounded ${filter === "" ? "bg-primary-50 text-primary-700" : "text-text-secondary hover:bg-gray-50"}`}
              onClick={() => setFilter("")}
            >
              All
            </button>
            <button
              className={`px-2.5 py-1 rounded ${filter === "USER" ? "bg-primary-50 text-primary-700" : "text-text-secondary hover:bg-gray-50"}`}
              onClick={() => setFilter("USER")}
            >
              User
            </button>
            <button
              className={`px-2.5 py-1 rounded ${filter === "ENTERPRISE" ? "bg-primary-50 text-primary-700" : "text-text-secondary hover:bg-gray-50"}`}
              onClick={() => setFilter("ENTERPRISE")}
            >
              Enterprise
            </button>
          </div>
        </div>

        {err ? (
          <div className="p-6 text-sm text-red-600">{err}</div>
        ) : loading ? (
          <div className="p-6 text-sm text-text-muted">Loading ledger…</div>
        ) : ledger.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            No credit transactions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  {[
                    "When",
                    "Account",
                    "Type",
                    "Reason",
                    "Delta",
                    "Balance After",
                    "Reference",
                    "Description",
                  ].map((h) => (
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
                  <tr
                    key={row.id}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary">
                      <span className="font-medium">{row.accountType}</span>
                      <div className="text-[10px] text-text-muted font-mono">
                        {row.accountId.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">
                      {row.type}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">
                      {row.reason}
                    </td>
                    <td
                      className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold ${row.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {row.delta >= 0 ? "+" : ""}
                      {row.delta.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">
                      {row.balanceAfter.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-[11px] text-text-muted">
                      {row.referenceType
                        ? `${row.referenceType}:${row.referenceId?.slice(0, 8) ?? ""}…`
                        : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary max-w-xs truncate">
                      {row.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AllocateModal
        kind={allocOpen}
        onClose={() => setAllocOpen(null)}
        onDone={() => {
          setAllocOpen(null);
          void load();
        }}
      />
    </div>
  );
}

function AllocateModal({
  kind,
  onClose,
  onDone,
}: {
  kind: null | "user" | "enterprise";
  onClose: () => void;
  onDone: () => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = kind !== null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = parseInt(amount, 10);
    if (!targetId.trim()) {
      setErr("Target ID is required.");
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Amount must be a positive integer.");
      return;
    }
    setSubmitting(true);
    try {
      if (kind === "user") {
        await creditsService.allocateUser({
          userId: targetId.trim(),
          amount: n,
          description: description.trim() || undefined,
        });
      } else if (kind === "enterprise") {
        await creditsService.allocateEnterprise({
          enterpriseId: targetId.trim(),
          amount: n,
          description: description.trim() || undefined,
        });
      }
      setTargetId("");
      setAmount("");
      setDescription("");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Allocation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="p-5">
        <div className="flex items-start justify-between">
          <h2 className="text-base font-bold text-text-primary">
            Allocate Credits to {kind === "user" ? "User" : "Enterprise"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              {kind === "user" ? "User ID" : "Enterprise ID"}
            </label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              required
              placeholder="UUID"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min={1}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              maxLength={500}
            />
          </div>
        </div>

        {err ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Allocating…" : "Allocate"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
