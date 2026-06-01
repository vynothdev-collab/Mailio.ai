"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Building2,
  Coins,
  UserCheck,
  Users as UsersIcon,
  Trash2,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import {
  enterprisesService,
  type Enterprise,
  type CreateEnterprisePayload,
} from "@/services/enterprises.service";

export default function EnterprisePage() {
  const [search, setSearch] = useState("");
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await enterprisesService.list({ limit: 100 });
      setEnterprises(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load enterprises.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      enterprises.filter((e) =>
        `${e.name} ${e.domain ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [enterprises, search],
  );

  const totals = useMemo(() => {
    const totalEnterprises = enterprises.length;
    const active = enterprises.filter((e) => e.isActive).length;
    const totalMembers = enterprises.reduce((s, e) => s + e.membersCount, 0);
    const totalCredits = enterprises.reduce(
      (s, e) => s + Number(e.creditBalance),
      0,
    );
    return { totalEnterprises, active, totalMembers, totalCredits };
  }, [enterprises]);

  return (
    <div>
      <PageHeader
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Enterprise
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard
          label="Total Enterprises"
          value={String(totals.totalEnterprises)}
          icon={Building2}
          accent="blue"
        />
        <StatCard
          label="Active"
          value={String(totals.active)}
          icon={UserCheck}
          accent="green"
        />
        <StatCard
          label="Members"
          value={String(totals.totalMembers)}
          icon={UsersIcon}
          accent="purple"
        />
        <StatCard
          label="Outstanding Credits"
          value={totals.totalCredits.toLocaleString()}
          icon={Coins}
          accent="orange"
        />
      </div>

      <Card noPadding className="mb-6">
        <div className="flex items-center justify-between p-4 gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-text-primary">
            Enterprise Accounts
          </h3>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search enterprises..."
            className="w-56"
          />
        </div>

        {error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            {search
              ? "No enterprises match your search."
              : "No enterprises yet. Click Add Enterprise to create one."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  {[
                    "Enterprise",
                    "Domain",
                    "Members",
                    "Credit Balance",
                    "Credits Used",
                    "Status",
                    "Created",
                    "Actions",
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
                {filtered.map((e) => (
                  <EnterpriseRow
                    key={e.id}
                    enterprise={e}
                    onDeleted={() => void load()}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateEnterpriseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function EnterpriseRow({
  enterprise,
  onDeleted,
}: {
  enterprise: Enterprise;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Soft-delete "${enterprise.name}"? Existing users keep access until you reassign or deactivate them.`))
      return;
    setDeleting(true);
    try {
      await enterprisesService.softDelete(enterprise.id);
      onDeleted();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
      <td className="px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={enterprise.name} size="sm" />
          <p className="font-medium text-text-primary whitespace-nowrap">
            {enterprise.name}
          </p>
        </div>
      </td>
      <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">
        {enterprise.domain ?? "—"}
      </td>
      <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">
        {enterprise.membersCount}
      </td>
      <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">
        {Number(enterprise.creditBalance).toLocaleString()}
      </td>
      <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">
        {Number(enterprise.creditsUsed).toLocaleString()}
      </td>
      <td className="px-3 sm:px-4 py-2 sm:py-3">
        <StatusBadge
          label={enterprise.isActive ? "Active" : "Inactive"}
          tone={enterprise.isActive ? "green" : "gray"}
        />
      </td>
      <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap">
        {new Date(enterprise.createdAt).toLocaleDateString()}
      </td>
      <td className="px-3 sm:px-4 py-2 sm:py-3">
        <button
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
          onClick={handleDelete}
          disabled={deleting}
          title="Soft-delete"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </td>
    </tr>
  );
}

interface CreateEnterpriseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateEnterpriseModal({
  open,
  onClose,
  onCreated,
}: CreateEnterpriseModalProps) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [initialCredits, setInitialCredits] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setDomain("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    setShowPassword(false);
    setInitialCredits("");
    setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const trimmedAdminEmail = adminEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedAdminEmail)) {
      setErr("Enter a valid admin email.");
      return;
    }
    if (adminPassword.length < 8) {
      setErr("Admin password must be at least 8 characters.");
      return;
    }

    const payload: CreateEnterprisePayload = {
      name: name.trim(),
      adminName: adminName.trim(),
      adminEmail: trimmedAdminEmail,
      adminPassword,
    };
    if (domain.trim()) payload.domain = domain.trim();
    if (initialCredits) {
      const n = parseInt(initialCredits, 10);
      if (!Number.isFinite(n) || n < 0) {
        setErr("Initial credits must be a positive integer.");
        return;
      }
      if (n > 0) payload.initialCredits = n;
    }
    setSubmitting(true);
    try {
      await enterprisesService.create(payload);
      reset();
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create enterprise.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              Create Enterprise
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Credentials will be emailed to the enterprise admin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">
            Enterprise
          </p>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Domain (optional)
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide pt-2">
              Enterprise Admin
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Admin Full Name
            </label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              minLength={2}
              placeholder="Jane Doe"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Admin Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              placeholder="admin@acme.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-16 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-text-muted hover:text-text-secondary px-1"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-text-muted">
              This password will be emailed to the admin. They should change it after first login.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide pt-2">
              Credits
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Initial Credits (optional)
            </label>
            <input
              type="number"
              value={initialCredits}
              onChange={(e) => setInitialCredits(e.target.value)}
              min={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              Credits to allocate immediately on creation.
            </p>
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
            {submitting ? "Creating…" : "Create & Send Invite"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
