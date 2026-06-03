"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Users, UserCheck, UserX, X, MoreVertical, KeyRound, Coins, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
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
} from "@/services/users.service";

// ── Confirm dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const accentBg =
    confirmVariant === "danger"   ? "bg-red-500" :
    confirmVariant === "success"  ? "bg-emerald-500" :
                                    "bg-blue-600";

  const confirmBg =
    confirmVariant === "danger"   ? "bg-red-600 hover:bg-red-700" :
    confirmVariant === "success"  ? "bg-emerald-600 hover:bg-emerald-700" :
                                    "bg-blue-600 hover:bg-blue-700";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className={`h-1 w-full ${accentBg}`} />
        <div className="px-6 pt-5 pb-6">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">{message}</p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${confirmBg}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Three-dot action menu ───────────────────────────────────────────────────

function ActionMenu({
  user,
  onChangePassword,
  onAddCredits,
  onToggleStatus,
}: {
  user: AdminUserRow;
  onChangePassword: () => void;
  onAddCredits: () => void;
  onToggleStatus: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUp: false });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't close if click is inside the toggle button OR inside the portal menu
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", handler);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function handleToggle() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuHeight = user.isActive ? 132 : 44;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 8;
    setCoords({
      top: openUp ? rect.top + window.scrollY - menuHeight - 4 : rect.bottom + window.scrollY + 4,
      left: rect.right + window.scrollX - 180,
      openUp,
    });
    setOpen((v) => !v);
  }

  const menu = open ? (
    <div
      ref={menuRef}
      style={{ position: "absolute", top: coords.top, left: coords.left }}
      className="z-[9999] w-44 rounded-xl border border-gray-200 bg-white shadow-xl py-1.5"
    >
      {user.isActive ? (
        <>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 rounded-lg mx-auto transition-colors"
            onClick={() => { setOpen(false); onChangePassword(); }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
              <KeyRound className="w-3 h-3 text-blue-600" />
            </span>
            Change Password
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 rounded-lg mx-auto transition-colors"
            onClick={() => { setOpen(false); onAddCredits(); }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50">
              <Coins className="w-3 h-3 text-emerald-600" />
            </span>
            Add Credits
          </button>
          <div className="my-1 mx-3 border-t border-gray-100" />
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg mx-auto transition-colors"
            onClick={() => { setOpen(false); onToggleStatus(); }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-50">
              <UserMinus className="w-3 h-3 text-red-500" />
            </span>
            Deactivate
          </button>
        </>
      ) : (
        <button
          type="button"
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg mx-auto transition-colors"
          onClick={() => { setOpen(false); onToggleStatus(); }}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50">
            <UserPlus className="w-3 h-3 text-emerald-600" />
          </span>
          Activate
        </button>
      )}
    </div>
  ) : null;

  return (
    <div data-action-menu className="inline-flex justify-center">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && typeof document !== "undefined" && createPortal(menu, document.body)}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Modals
  const [createOpen, setCreateOpen]           = useState(false);
  const [passwordTarget, setPasswordTarget]   = useState<AdminUserRow | null>(null);
  const [creditsTarget, setCreditsTarget]     = useState<AdminUserRow | null>(null);
  const [statusTarget, setStatusTarget]       = useState<AdminUserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await adminUsersExtService.list({
        search: search || undefined,
        role: "USER",
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
  }, [search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const activeCount   = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  // Toggle activate / deactivate
  async function confirmStatusToggle() {
    if (!statusTarget) return;
    const next = !statusTarget.isActive;
    try {
      await adminUsersExtService.setStatus(statusTarget.id, next);
      toast.success(
        next
          ? `${statusTarget.name} has been activated.`
          : `${statusTarget.name} has been deactivated.`,
      );
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status.");
    } finally {
      setStatusTarget(null);
    }
  }

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Total" value={String(total)} icon={Users} accent="blue" />
        <StatCard label="Active" value={String(activeCount)} icon={UserCheck} accent="green" />
        <StatCard label="Inactive" value={String(inactiveCount)} icon={UserX} accent="orange" />
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
                  {["User", "Email", "Credit Balance", "Used", "Status", "Created", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap last:text-center"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="sm" />
                        <p className="font-medium text-text-primary whitespace-nowrap">{u.name}</p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{u.email}</td>
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
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                      <ActionMenu
                        user={u}
                        onChangePassword={() => setPasswordTarget(u)}
                        onAddCredits={() => setCreditsTarget(u)}
                        onToggleStatus={() => setStatusTarget(u)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create user */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); void load(); }}
      />

      {/* Change password */}
      <ChangePasswordModal
        user={passwordTarget}
        onClose={() => setPasswordTarget(null)}
        onSaved={() => setPasswordTarget(null)}
      />

      {/* Add credits */}
      <AddCreditsModal
        user={creditsTarget}
        onClose={() => setCreditsTarget(null)}
        onSaved={() => { setCreditsTarget(null); void load(); }}
      />

      {/* Activate / Deactivate confirm */}
      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.isActive ? "Deactivate User?" : "Activate User?"}
        message={
          statusTarget?.isActive
            ? `Are you sure you want to deactivate ${statusTarget?.name}? They will not be able to log in until reactivated.`
            : `Are you sure you want to activate ${statusTarget?.name}? They will regain access to the platform.`
        }
        confirmLabel={statusTarget?.isActive ? "Deactivate" : "Activate"}
        confirmVariant={statusTarget?.isActive ? "danger" : "success"}
        onConfirm={confirmStatusToggle}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}

// ── Create User modal ───────────────────────────────────────────────────────

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
  const [initialCredits, setInitialCredits] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => { setName(""); setEmail(""); setPassword(""); setInitialCredits(""); setErr(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const payload: CreateUserPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: "USER",
    };

    if (initialCredits) {
      const n = parseInt(initialCredits, 10);
      if (!Number.isFinite(n) || n < 0) { setErr("Initial credits must be a positive integer."); return; }
      if (n > 0) payload.initialCredits = n;
    }

    setSubmitting(true);
    try {
      await adminUsersExtService.create(payload);
      toast.success("User created successfully.");
      reset();
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}>
      <form onSubmit={submit} className="p-5 max-w-md">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-base font-bold text-text-primary">Create User</h2>
          <button type="button" onClick={() => { reset(); onClose(); }} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </Field>
          <Field label="Temporary Password">
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </Field>
          <Field label="Initial Credits" hint="optional">
            <input type="number" min={0} value={initialCredits} onChange={(e) => setInitialCredits(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </Field>
        </div>

        {err && <ErrorBox msg={err} />}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Creating…" : "Create User"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Change Password modal ───────────────────────────────────────────────────

function ChangePasswordModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState<string | null>(null);

  useEffect(() => {
    if (user) { setPassword(""); setConfirm(""); setErr(null); setShowConfirm(false); }
  }, [user]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setErr("Passwords do not match."); return; }
    setShowConfirm(true);
  };

  const doChange = async () => {
    setSubmitting(true);
    try {
      await adminUsersExtService.changePassword(user.id, password);
      toast.success(`Password updated for ${user.name}.`);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to change password.");
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal open onClose={onClose}>
        <form onSubmit={handleSubmit} className="p-5 max-w-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Change Password</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Setting new password for <span className="font-medium text-text-primary">{user.name}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4">
            <Field label="New Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
            <Field label="Confirm Password">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="Re-enter new password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </div>

          {err && <ErrorBox msg={err} />}

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">Change Password</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={showConfirm}
        title="Confirm Password Change"
        message={`Are you sure you want to change the password for ${user.name}? They will need to use the new password on their next login.`}
        confirmLabel={submitting ? "Changing…" : "Yes, Change Password"}
        onConfirm={doChange}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

// ── Add Credits modal ───────────────────────────────────────────────────────

function AddCreditsModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount]   = useState("");
  const [reason, setReason]   = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  useEffect(() => {
    if (user) { setAmount(""); setReason(""); setErr(null); setShowConfirm(false); }
  }, [user]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n < 1) { setErr("Please enter a valid amount (minimum 1)."); return; }
    setShowConfirm(true);
  };

  const confirm = async () => {
    setSubmitting(true);
    try {
      await adminUsersExtService.addCredits(user.id, parseInt(amount, 10), reason || undefined);
      toast.success(`${parseInt(amount, 10).toLocaleString()} credits added to ${user.name}.`);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add credits.");
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal open onClose={onClose}>
        <form onSubmit={handleSubmit} className="p-5 max-w-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Add Credits</h2>
              <p className="text-xs text-text-muted mt-0.5">Adding credits to <span className="font-medium text-text-primary">{user.name}</span></p>
            </div>
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>

          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Current balance: <span className="font-semibold">{Number(user.creditBalance).toLocaleString()} credits</span>
          </div>

          <div className="space-y-4">
            <Field label="Amount to Add">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="e.g. 500"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
            <Field label="Reason" hint="optional">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Promotional top-up"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </div>

          {err && <ErrorBox msg={err} />}

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">Add Credits</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={showConfirm}
        title="Confirm Credit Addition"
        message={`Add ${parseInt(amount || "0", 10).toLocaleString()} credits to ${user.name}? This action cannot be undone.`}
        confirmLabel={submitting ? "Adding…" : "Yes, Add Credits"}
        onConfirm={confirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

// ── Shared small helpers ────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}{hint && <span className="ml-1 font-normal text-text-muted">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {msg}
    </div>
  );
}
