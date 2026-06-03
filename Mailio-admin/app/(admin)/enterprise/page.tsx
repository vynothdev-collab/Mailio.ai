"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Building2,
  Coins,
  UserCheck,
  Users as UsersIcon,
  X,
  Shield,
  User,
  MoreVertical,
  KeyRound,
  UserMinus,
  UserPlus,
  Trash2,
} from "lucide-react";
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
  enterprisesService,
  type Enterprise,
  type EnterpriseMember,
  type EnterpriseCreditSummary,
  type CreateEnterprisePayload,
} from "@/services/enterprises.service";

// ── ConfirmDialog ────────────────────────────────────────────────────────────

type ConfirmVariant = "primary" | "danger" | "success";

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const confirmBg =
    confirmVariant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : confirmVariant === "success"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-blue-600 hover:bg-blue-700";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white shadow-2xl p-6">
        <h3 className="text-base font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-text-primary hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${confirmBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── AddCreditsModal ──────────────────────────────────────────────────────────

function AddCreditsModal({
  open,
  enterprise,
  onClose,
  onSubmit,
}: {
  open: boolean;
  enterprise: Enterprise | null;
  onClose: () => void;
  onSubmit: (amount: number, reason: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setAmount(""); setReason(""); setErr(null); setBusy(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n < 1) { setErr("Enter a positive integer amount."); return; }
    setBusy(true);
    try {
      await onSubmit(n, reason.trim());
      reset();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add credits.");
      setBusy(false);
    }
  };

  if (!enterprise) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Coins className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Add Credits</h2>
              <p className="text-[11px] text-text-muted mt-0.5">{enterprise.name}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Current Balance</p>
          <p className="text-lg font-bold text-text-primary mt-0.5">
            {Number(enterprise.creditBalance).toLocaleString()} credits
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Amount to Add</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min={1}
              placeholder="e.g. 1000"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Reason <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Monthly top-up"
              maxLength={255}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Adding…" : "Add Credits"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── ResetPasswordModal ───────────────────────────────────────────────────────

function ResetPasswordModal({
  open,
  enterpriseName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  enterpriseName: string;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirm("");
    setShow(false);
    setErr(null);
    setBusy(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setErr("Passwords do not match."); return; }
    setBusy(true);
    try {
      await onSubmit(password);
      reset();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to reset password.");
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <KeyRound className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Reset Admin Password</h2>
              <p className="text-[11px] text-text-muted mt-0.5">{enterpriseName}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">New Password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-16 text-sm"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-text-muted hover:text-text-secondary px-1"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Confirm Password</label>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Re-enter new password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : "Reset Password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── CreditSummaryModal ───────────────────────────────────────────────────────

function CreditSummaryModal({
  enterprise,
  onClose,
}: {
  enterprise: Enterprise | null;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState<EnterpriseCreditSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!enterprise) return;
    setLoading(true);
    setErr(null);
    setSummary(null);
    enterprisesService
      .creditSummary(enterprise.id)
      .then(setSummary)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load credit summary."))
      .finally(() => setLoading(false));
  }, [enterprise]);

  if (!enterprise) return null;

  return (
    <Modal open onClose={onClose} size="xl">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
              <Coins className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Credit Summary</h2>
              <p className="text-xs text-text-muted mt-0.5">{enterprise.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && <div className="py-10 text-center text-sm text-text-muted">Loading…</div>}
        {err && <div className="py-6 text-center text-sm text-red-500">{err}</div>}

        {summary && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Enterprise Pool", value: summary.enterprisePool.toLocaleString() },
                { label: "Total Allocated", value: summary.totalAllocated.toLocaleString() },
                { label: "Total Used", value: summary.totalUsed.toLocaleString() },
                { label: "Admin Usable", value: summary.adminUsable.toLocaleString() },
                {
                  label: "Expires",
                  value: summary.expiresAt
                    ? new Date(summary.expiresAt).toLocaleDateString()
                    : "—",
                },
                {
                  label: "Days Left",
                  value: summary.daysRemaining != null ? String(summary.daysRemaining) : "—",
                },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">{label}</p>
                  <p className="text-base font-bold text-text-primary mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {summary.users.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">No enterprise users yet.</div>
            ) : (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      {["Member", "Email", "Allocated", "Used", "Remaining", "Expires"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={u.name} size="sm" />
                            <span className="font-medium text-text-primary whitespace-nowrap">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {u.allocated > 0 ? u.allocated.toLocaleString() : <span className="text-text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{u.used.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={u.remaining > 0 ? "text-emerald-600 font-medium" : "text-text-muted"}>
                            {u.remaining.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                          {u.expiresAt ? new Date(u.expiresAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ── EnterpriseActionMenu ─────────────────────────────────────────────────────

function EnterpriseActionMenu({
  enterprise,
  onRefresh,
}: {
  enterprise: Enterprise;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [confirm, setConfirm] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    variant: ConfirmVariant;
    action: () => Promise<void>;
  }>(null);
  const [busy, setBusy] = useState(false);

  const [addCreditsOpen, setAddCreditsOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [creditSummaryOpen, setCreditSummaryOpen] = useState(false);

  // Position menu below button
  const openMenu = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    setOpen(true);
  };

  // Close on outside mousedown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    setOpen(false);
    setConfirm({
      title: "Delete Enterprise",
      message: `"${enterprise.name}" and all its users will be deactivated and soft-deleted. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
      action: async () => {
        await enterprisesService.softDelete(enterprise.id);
        toast.success(`Enterprise "${enterprise.name}" deleted.`);
        onRefresh();
      },
    });
  };

  const handleToggleStatus = () => {
    setOpen(false);
    const willActivate = !enterprise.isActive;
    setConfirm({
      title: willActivate ? "Activate Enterprise" : "Deactivate Enterprise",
      message: willActivate
        ? `"${enterprise.name}" and all its members will be able to log in again.`
        : `"${enterprise.name}" and all its members will be unable to log in until reactivated.`,
      confirmLabel: willActivate ? "Activate" : "Deactivate",
      variant: willActivate ? "success" : "danger",
      action: async () => {
        await enterprisesService.setStatus(enterprise.id, willActivate);
        toast.success(
          willActivate
            ? `Enterprise "${enterprise.name}" activated.`
            : `Enterprise "${enterprise.name}" deactivated.`,
        );
        onRefresh();
      },
    });
  };

  const handleAddCredits = () => {
    setOpen(false);
    setAddCreditsOpen(true);
  };

  const handleResetPassword = () => {
    setOpen(false);
    setResetPasswordOpen(true);
  };

  const execConfirm = async () => {
    if (!confirm) return;
    await run(confirm.action);
    setConfirm(null);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        disabled={busy}
        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
        title="Actions"
      >
        <MoreVertical className="w-4 h-4 text-text-muted" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 9998 }}
            className="w-44 rounded-xl bg-white shadow-lg border border-gray-100 py-1 text-sm"
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-text-primary hover:bg-gray-50"
              onClick={() => { setOpen(false); setCreditSummaryOpen(true); }}
            >
              <Coins className="w-3.5 h-3.5 text-blue-500" />
              Credit Summary
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-text-primary hover:bg-gray-50"
              onClick={handleAddCredits}
            >
              <Coins className="w-3.5 h-3.5 text-orange-500" />
              Add Credits
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-text-primary hover:bg-gray-50"
              onClick={handleResetPassword}
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-500" />
              Reset Password
            </button>
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-50 ${
                enterprise.isActive ? "text-amber-600" : "text-emerald-600"
              }`}
              onClick={handleToggleStatus}
            >
              {enterprise.isActive ? (
                <>
                  <UserMinus className="w-3.5 h-3.5" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Activate
                </>
              )}
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        confirmVariant={confirm?.variant ?? "primary"}
        onConfirm={execConfirm}
        onCancel={() => setConfirm(null)}
      />

      <AddCreditsModal
        open={addCreditsOpen}
        enterprise={enterprise}
        onClose={() => setAddCreditsOpen(false)}
        onSubmit={async (amount, reason) => {
          const result = await enterprisesService.addCredits(enterprise.id, amount, reason || undefined);
          toast.success(`Added ${amount.toLocaleString()} credits. New balance: ${result.balanceAfter.toLocaleString()}.`);
          onRefresh();
        }}
      />

      <ResetPasswordModal
        open={resetPasswordOpen}
        enterpriseName={enterprise.name}
        onClose={() => setResetPasswordOpen(false)}
        onSubmit={async (newPassword) => {
          await enterprisesService.resetAdminPassword(enterprise.id, newPassword);
          toast.success(`Admin password for "${enterprise.name}" has been reset.`);
        }}
      />

      {creditSummaryOpen && (
        <CreditSummaryModal
          enterprise={enterprise}
          onClose={() => setCreditSummaryOpen(false)}
        />
      )}
    </>
  );
}

// ── EnterpriseRow ────────────────────────────────────────────────────────────

function EnterpriseRow({
  enterprise,
  onRefresh,
  onViewMembers,
}: {
  enterprise: Enterprise;
  onRefresh: () => void;
  onViewMembers: () => void;
}) {
  return (
    <tr
      className="border-b border-gray-50 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors"
      onClick={onViewMembers}
    >
      <td className="px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={enterprise.name} size="sm" />
          <div>
            <p className="font-medium text-text-primary whitespace-nowrap">
              {enterprise.name}
            </p>
            {enterprise.membersCount > 0 && (
              <p className="text-[10px] text-text-muted mt-0.5">
                {enterprise.membersCount} member{enterprise.membersCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
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
      <td
        className="px-3 sm:px-4 py-2 sm:py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <EnterpriseActionMenu enterprise={enterprise} onRefresh={onRefresh} />
      </td>
    </tr>
  );
}

// ── EnterpriseMembersModal ───────────────────────────────────────────────────

const PAGE_SIZE = 10;

type RoleTab = "ALL" | "ENTERPRISE_ADMIN" | "ENTERPRISE_USER";

function EnterpriseMembersModal({
  enterprise,
  onClose,
}: {
  enterprise: Enterprise | null;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<EnterpriseMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleTab, setRoleTab] = useState<RoleTab>("ALL");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchMembers = useCallback(
    async (p: number, role: RoleTab) => {
      if (!enterprise) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await enterprisesService.members(
          enterprise.id,
          p,
          PAGE_SIZE,
          role === "ALL" ? undefined : role,
        );
        setMembers(res.data);
        setTotal(res.total);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load members.");
      } finally {
        setLoading(false);
      }
    },
    [enterprise],
  );

  useEffect(() => {
    if (!enterprise) return;
    setPage(1);
    setRoleTab("ALL");
  }, [enterprise]);

  useEffect(() => {
    void fetchMembers(page, roleTab);
  }, [fetchMembers, page, roleTab]);

  function handleTabChange(tab: RoleTab) {
    setRoleTab(tab);
    setPage(1);
  }

  if (!enterprise) return null;

  const tabs: { key: RoleTab; label: string }[] = [
    { key: "ALL", label: "All Members" },
    { key: "ENTERPRISE_ADMIN", label: "Admins" },
    { key: "ENTERPRISE_USER", label: "Users" },
  ];

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <Modal open onClose={onClose} size="xl">
      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">{enterprise.name}</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {enterprise.domain ?? "No domain"} &middot;{" "}
                {enterprise.membersCount} member{enterprise.membersCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Credit Balance", value: Number(enterprise.creditBalance).toLocaleString() },
            { label: "Credits Used", value: Number(enterprise.creditsUsed).toLocaleString() },
            {
              label: "Status",
              value: enterprise.isActive ? "Active" : "Inactive",
              valueClass: enterprise.isActive ? "text-emerald-600" : "text-gray-400",
            },
          ].map(({ label, value, valueClass }) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">{label}</p>
              <p className={`text-base font-bold mt-0.5 ${valueClass ?? "text-text-primary"}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Role tabs */}
        <div className="flex items-center gap-1 border-b border-gray-100 pb-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                roleTab === t.key
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-text-muted hover:text-text-primary hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-text-muted">Loading members…</div>
          ) : err ? (
            <div className="py-8 text-center text-sm text-red-500">{err}</div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-sm text-text-muted">
              No{" "}
              {roleTab === "ENTERPRISE_ADMIN"
                ? "admins"
                : roleTab === "ENTERPRISE_USER"
                ? "users"
                : "members"}{" "}
              found.
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  {["Member", "Email", "Role", "Status", "Joined"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isAdmin = m.role === "ENTERPRISE_ADMIN";
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} size="sm" />
                          <p className="font-medium text-text-primary whitespace-nowrap">{m.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{m.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            isAdmin ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {isAdmin ? (
                            <Shield className="w-2.5 h-2.5" />
                          ) : (
                            <User className="w-2.5 h-2.5" />
                          )}
                          {isAdmin ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={m.isActive ? "Active" : "Inactive"}
                          tone={m.isActive ? "green" : "gray"}
                        />
                      </td>
                      <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              Showing {start}–{end} of {total} member{total !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-primary hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
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
                    <span key={`e${i}`} className="px-2 text-text-muted">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p as number)}
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
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-primary hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EnterprisePage() {
  const [search, setSearch] = useState("");
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [membersTarget, setMembersTarget] = useState<Enterprise | null>(null);

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
        `${e.name} ${e.domain ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [enterprises, search],
  );

  const totals = useMemo(() => {
    const totalEnterprises = enterprises.length;
    const active = enterprises.filter((e) => e.isActive).length;
    const totalMembers = enterprises.reduce((s, e) => s + e.membersCount, 0);
    const totalCredits = enterprises.reduce((s, e) => s + Number(e.creditBalance), 0);
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
          <h3 className="text-sm font-semibold text-text-primary">Enterprise Accounts</h3>
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
                    onRefresh={() => void load()}
                    onViewMembers={() => setMembersTarget(e)}
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

      <EnterpriseMembersModal
        enterprise={membersTarget}
        onClose={() => setMembersTarget(null)}
      />
    </div>
  );
}

// ── CreateEnterpriseModal ────────────────────────────────────────────────────

interface CreateEnterpriseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateEnterpriseModal({ open, onClose, onCreated }: CreateEnterpriseModalProps) {
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
            <h2 className="text-base font-bold text-text-primary">Create Enterprise</h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Credentials will be emailed to the enterprise admin.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">
            Enterprise
          </p>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
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
            <label className="block text-xs font-medium text-text-secondary mb-1">Admin Email</label>
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
