"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Users, UserCheck, X, Building2, Shield } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import {
  adminUsersExtService,
  type AdminUserRow,
  type CreateUserPayload,
  type UserRole,
} from "@/services/users.service";
import {
  enterprisesService,
  type Enterprise,
} from "@/services/enterprises.service";

const ROLE_LABEL: Record<UserRole, string> = {
  USER: "User",
  ENTERPRISE_USER: "Enterprise User",
  ENTERPRISE_ADMIN: "Enterprise Admin",
  SUPER_ADMIN: "Super Admin",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [statusFilter, setStatusFilter] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await adminUsersExtService.list({
        search: search || undefined,
        role: (roleFilter || undefined) as UserRole | undefined,
        isActive: statusFilter || undefined,
        limit: 50,
      });
      setUsers(res.data);
      setTotal(res.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const enterpriseUsersCount = users.filter(
    (u) =>
      u.role === "ENTERPRISE_USER" || u.role === "ENTERPRISE_ADMIN",
  ).length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div>
      <PageHeader
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add User
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Total (current view)" value={String(total)} icon={Users} accent="blue" />
        <StatCard label="Active" value={String(activeCount)} icon={UserCheck} accent="green" />
        <StatCard
          label="Enterprise members"
          value={String(enterpriseUsersCount)}
          icon={Building2}
          accent="purple"
        />
        <StatCard
          label="Super Admins"
          value={String(users.filter((u) => u.role === "SUPER_ADMIN").length)}
          icon={Shield}
          accent="orange"
        />
      </div>

      <Card noPadding>
        <div className="flex items-center justify-between p-4 gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-text-primary">Users</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name or email..."
              className="w-56"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "" | UserRole)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="ENTERPRISE_USER">Enterprise User</option>
              <option value="ENTERPRISE_ADMIN">Enterprise Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {err ? (
          <div className="p-6 text-sm text-red-600">{err}</div>
        ) : loading ? (
          <div className="p-6 text-sm text-text-muted">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            No users match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  {[
                    "User",
                    "Email",
                    "Role",
                    "Enterprise",
                    "Credit Balance",
                    "Used",
                    "Status",
                    "Created",
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
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                  >
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="sm" />
                        <p className="font-medium text-text-primary whitespace-nowrap">
                          {u.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">
                      {u.email}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">
                      {ROLE_LABEL[u.role]}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-[11px] text-text-muted font-mono">
                      {u.enterpriseId ? `${u.enterpriseId.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-primary font-medium">
                      {Number(u.creditBalance).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">
                      {Number(u.creditsUsed).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <StatusBadge
                        label={u.isActive ? "Active" : "Inactive"}
                        tone={u.isActive ? "green" : "gray"}
                      />
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateUserModal
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

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [enterpriseId, setEnterpriseId] = useState("");
  const [initialCredits, setInitialCredits] = useState("");
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const needsEnterprise =
    role === "ENTERPRISE_USER" || role === "ENTERPRISE_ADMIN";
  const allowsInitialCredits = role === "USER";

  useEffect(() => {
    if (!open) return;
    void enterprisesService
      .list({ limit: 100, isActive: "true" })
      .then((res) => setEnterprises(res.data))
      .catch(() => setEnterprises([]));
  }, [open]);

  // Clear fields that don't apply when the role changes.
  useEffect(() => {
    if (!needsEnterprise) setEnterpriseId("");
    if (!allowsInitialCredits) setInitialCredits("");
  }, [needsEnterprise, allowsInitialCredits]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const payload: CreateUserPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    };
    if (needsEnterprise) {
      if (!enterpriseId) {
        setErr("Pick an enterprise for this role.");
        return;
      }
      payload.enterpriseId = enterpriseId;
    }
    if (allowsInitialCredits && initialCredits) {
      const n = parseInt(initialCredits, 10);
      if (!Number.isFinite(n) || n < 0) {
        setErr("Initial credits must be a positive integer.");
        return;
      }
      if (n > 0) payload.initialCredits = n;
    }

    setSubmitting(true);
    try {
      await adminUsersExtService.create(payload);
      setName("");
      setEmail("");
      setPassword("");
      setRole("USER");
      setEnterpriseId("");
      setInitialCredits("");
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="p-5 max-w-md">
        <div className="flex items-start justify-between">
          <h2 className="text-base font-bold text-text-primary">Create User</h2>
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
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Temporary Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="USER">User (own credit balance)</option>
              <option value="ENTERPRISE_USER">Enterprise User</option>
              <option value="ENTERPRISE_ADMIN">Enterprise Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          {needsEnterprise ? (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Enterprise
              </label>
              <select
                value={enterpriseId}
                onChange={(e) => setEnterpriseId(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select enterprise…</option>
                {enterprises.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                    {ent.domain ? ` (${ent.domain})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {allowsInitialCredits ? (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Initial Credits (optional)
              </label>
              <input
                type="number"
                min={0}
                value={initialCredits}
                onChange={(e) => setInitialCredits(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Only normal Users have a personal balance.
              </p>
            </div>
          ) : null}
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
            {submitting ? "Creating…" : "Create User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
