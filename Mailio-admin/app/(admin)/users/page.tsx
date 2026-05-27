"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import AdminStatusBadge from "@/components/ui/AdminStatusBadge";
import Pagination from "@/components/ui/Pagination";
import { adminUsersService } from "@/services/admin.service";
import type { UserRow } from "@/types";
import { PLAN_LABELS, PLAN_COLORS } from "@/constants";

const PLANS = ["", "FREE", "PRO", "ULTIMATE"];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [isActive, setIsActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ id: string; pwd: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    adminUsersService
      .findAll({ search, plan, isActive, page, limit: 20 })
      .then((res) => {
        setUsers(res.data);
        setTotal(res.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, plan, isActive, page]);

  useEffect(() => {
    load();
  }, [load]);

  // reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, plan, isActive]);

  async function toggleStatus(user: UserRow) {
    setActionLoading(user.id + "-status");
    try {
      await adminUsersService.updateStatus(user.id, !user.isActive);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function resetPassword(id: string) {
    if (!confirm("Reset this user's password? A temporary password will be generated.")) return;
    setActionLoading(id + "-reset");
    try {
      const res = await adminUsersService.resetPassword(id);
      setTempPassword({ id, pwd: res.tempPassword });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Deactivate this user?")) return;
    setActionLoading(id + "-delete");
    try {
      await adminUsersService.softDelete(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: false } : u)));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Users</h1>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">All Plans</option>
            {PLANS.filter(Boolean).map((p) => (
              <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>
            ))}
          </select>
          <select
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </Card>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      {/* Temp password toast */}
      {tempPassword && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <p className="font-semibold text-yellow-800 mb-1">Temporary Password Generated</p>
          <p className="text-yellow-700">
            Share this with the user:{" "}
            <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono font-bold">
              {tempPassword.pwd}
            </code>
          </p>
          <button
            onClick={() => setTempPassword(null)}
            className="mt-2 text-xs text-yellow-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-text-muted">Loading…</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-text-muted">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[user.plan] ?? "bg-gray-100 text-gray-600"}`}>
                        {PLAN_LABELS[user.plan] ?? user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge active={user.isActive} />
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs uppercase">{user.provider}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStatus(user)}
                          disabled={actionLoading === user.id + "-status"}
                          className="text-xs px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40"
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                        {user.provider === "LOCAL" && (
                          <button
                            onClick={() => resetPassword(user.id)}
                            disabled={actionLoading === user.id + "-reset"}
                            className="text-xs px-2.5 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
                          >
                            Reset Pwd
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(user.id)}
                          disabled={actionLoading === user.id + "-delete"}
                          className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </Card>
    </div>
  );
}
