"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Plus, UserPlus, Users, Wallet, Activity, UserCheck,
  Loader2, Coins, TrendingUp, PieChart, BarChart2, ShieldCheck,
  MoreVertical, Pencil, KeyRound, UserX, UserCheck2, Trash2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { RoleGuard } from "@/src/components/auth/RoleGuard";
import { cn } from "@/src/lib/utils";
import {
  enterpriseService,
  type EnterpriseUser,
  type EnterpriseOverview,
  type EnterpriseCreditSummary,
} from "@/src/services/enterpriseService";
import type { ApiError } from "@/src/types/auth";
import { CreateEnterpriseUserDialog } from "./CreateEnterpriseUserDialog";
import { AddExistingUserDialog } from "./AddExistingUserDialog";

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label, value, icon: Icon, iconBg, iconColor, loading,
}: {
  label: string; value: string | number; icon: React.ElementType;
  iconBg: string; iconColor: string; loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg)}>
        <Icon size={17} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {loading
          ? <Skeleton className="mt-1 h-6 w-16" />
          : <p className="text-xl font-bold tabular-nums">{value}</p>}
      </div>
    </div>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: EnterpriseUser["role"] }) {
  const isAdmin = role === "ENTERPRISE_ADMIN";
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
    )}>
      {isAdmin ? "Admin" : "Member"}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
      active
        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
        : "bg-muted border-border text-muted-foreground",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-gray-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Shared form field ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      {message}
    </div>
  );
}

// ── Allocate Credit Dialog ────────────────────────────────────────────────────

function AllocateCreditDialog({
  user, available, onClose, onSaved,
}: {
  user: EnterpriseUser; available: number; onClose: () => void; onSaved: () => void;
}) {
  const currentAllocation = user.creditLimit ?? 0;
  const [amount, setAmount] = useState(String(currentAllocation));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const maxAllowable = currentAllocation + available;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n < 0) { setErr("Enter a valid number."); return; }
    if (n < user.creditsUsed) {
      setErr(`Cannot go below already-used credits (${user.creditsUsed.toLocaleString()}).`);
      return;
    }
    if (n > maxAllowable) {
      setErr(`Maximum allocatable is ${maxAllowable.toLocaleString()} credits.`);
      return;
    }
    setBusy(true);
    try {
      await enterpriseService.allocateCredits(user.id, n);
      toast.success(`Allocated ${n.toLocaleString()} credits to ${user.name}.`);
      onSaved();
      onClose();
    } catch (e) {
      setErr((e as ApiError)?.message ?? "Failed to update allocation.");
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm!" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
              <Coins size={16} className="text-violet-600" />
            </div>
            <div>
              <DialogTitle>Change Credits</DialogTitle>
              <DialogDescription className="mt-0">{user.name} · {user.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Used", value: user.creditsUsed.toLocaleString() },
            { label: "Allocated", value: currentAllocation > 0 ? currentAllocation.toLocaleString() : "—" },
            { label: "Pool Free", value: available.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
              <p className="text-sm font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="New Allocation (credits)">
            <input
              type="number"
              min={user.creditsUsed}
              max={maxAllowable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Min: {user.creditsUsed.toLocaleString()} · Max: {maxAllowable.toLocaleString()}
            </p>
          </Field>

          {err && <ErrorBox message={err} />}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────

function EditUserModal({
  user, onClose, onSaved,
}: {
  user: EnterpriseUser; onClose: () => void; onSaved: (updated: EnterpriseUser) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (name.trim().length < 2) { setErr("Name must be at least 2 characters."); return; }
    if (!/.+@.+\..+/.test(email)) { setErr("Enter a valid email address."); return; }
    setBusy(true);
    try {
      const updated = await enterpriseService.updateUserDetails(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      toast.success("User details updated successfully.");
      onSaved(updated);
      onClose();
    } catch (e) {
      setErr((e as ApiError)?.message ?? "Failed to update user.");
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm!" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Pencil size={16} className="text-blue-600" />
            </div>
            <div>
              <DialogTitle>Edit User Details</DialogTitle>
              <DialogDescription className="mt-0">Update name or email address</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={busy}
            />
          </Field>

          <Field label="Email Address">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={busy}
            />
          </Field>

          {err && <ErrorBox message={err} />}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({
  user, onClose,
}: {
  user: EnterpriseUser; onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setBusy(true);
    try {
      await enterpriseService.changeUserPassword(user.id, password);
      toast.success(`Password updated for ${user.name}.`);
      onClose();
    } catch (e) {
      setErr((e as ApiError)?.message ?? "Failed to change password.");
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm!" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
              <KeyRound size={16} className="text-orange-600" />
            </div>
            <div>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription className="mt-0">{user.name} · {user.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="New Password">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">Share this securely with the user after updating.</p>
          </Field>

          {err && <ErrorBox message={err} />}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  icon,
  iconBg,
  iconColor,
  title,
  description,
  body,
  confirmLabel,
  confirmClassName,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmClassName: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const Icon = icon;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm!" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", iconBg)}>
              <Icon size={18} className={iconColor} />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-0">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="text-sm text-muted-foreground leading-relaxed">{body}</div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            size="sm"
            className={cn("border-0 text-white", confirmClassName)}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Action menu ───────────────────────────────────────────────────────────────

type ActiveModal =
  | { type: "credits" }
  | { type: "edit" }
  | { type: "password" }
  | { type: "delete" }
  | { type: "status" };

function ActionMenu({
  user,
  onAction,
}: {
  user: EnterpriseUser;
  onAction: (modal: ActiveModal) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right - 168 });
    }
    setOpen((v) => !v);
  };

  const pick = (modal: ActiveModal) => { setOpen(false); onAction(modal); };

  const items: Array<{
    label: string;
    icon: React.ElementType;
    modal: ActiveModal;
    className?: string;
    dividerBefore?: boolean;
  }> = [
    { label: "Edit User Details",                         icon: Pencil,     modal: { type: "edit" } },
    { label: "Change Credits",                            icon: Coins,      modal: { type: "credits" } },
    { label: "Change Password",                           icon: KeyRound,   modal: { type: "password" } },
    {
      label: user.isActive ? "Deactivate User" : "Activate User",
      icon: user.isActive ? UserX : UserCheck2,
      modal: { type: "status" },
      className: user.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50",
      dividerBefore: true,
    },
    {
      label: "Delete User",
      icon: Trash2,
      modal: { type: "delete" },
      className: "text-red-600 hover:bg-red-50",
    },
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="inline-flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:bg-muted transition-colors"
      >
        <MoreVertical size={14} />
      </button>

      {open && typeof window !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-44 rounded-xl border border-border bg-white shadow-xl py-1.5 text-sm"
        >
          {items.map(({ label, icon: Icon, modal, className, dividerBefore }) => (
            <div key={label}>
              {dividerBefore && <div className="my-1 border-t border-border" />}
              <button
                type="button"
                onClick={() => pick(modal)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  className ?? "text-gray-700 hover:bg-muted/60",
                )}
              >
                <Icon size={13} className="shrink-0" />
                {label}
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EnterpriseUsersPageClient() {
  return (
    <RoleGuard allow={["ENTERPRISE_ADMIN"]}>
      <EnterpriseUsersInner />
    </RoleGuard>
  );
}

function EnterpriseUsersInner() {
  const [users,           setUsers]           = useState<EnterpriseUser[]>([]);
  const [overview,        setOverview]        = useState<EnterpriseOverview | null>(null);
  const [creditSummary,   setCreditSummary]   = useState<EnterpriseCreditSummary | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [createOpen,      setCreateOpen]      = useState(false);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [refreshKey,      setRefreshKey]      = useState(0);

  const [activeUser,  setActiveUser]  = useState<EnterpriseUser | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [actionBusy,  setActionBusy]  = useState(false);

  const load = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, ov, cs] = await Promise.all([
          enterpriseService.listUsers(1, 100),
          enterpriseService.getOverview(),
          enterpriseService.getCreditSummary(),
        ]);
        if (controller.signal.aborted) return;
        setUsers(usersRes.data);
        setOverview(ov);
        setCreditSummary(cs);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError((e as ApiError)?.message ?? "Failed to load enterprise data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [refreshKey]);

  const handleCreated = useCallback((created: EnterpriseUser) => {
    toast.success(`${created.email} added to your enterprise.`);
    setCreateOpen(false);
    load();
  }, [load]);

  const handleAdded = useCallback((added: EnterpriseUser) => {
    toast.success(`${added.email} added to your enterprise.`);
    setAddExistingOpen(false);
    load();
  }, [load]);

  const openAction = useCallback((user: EnterpriseUser, modal: ActiveModal) => {
    setActiveUser(user);
    setActiveModal(modal);
  }, []);

  const closeModal = () => { if (actionBusy) return; setActiveUser(null); setActiveModal(null); };

  const handleDelete = async () => {
    if (!activeUser) return;
    setActionBusy(true);
    try {
      await enterpriseService.softDeleteUser(activeUser.id);
      toast.success(`${activeUser.name} has been deleted.`);
      setActiveUser(null); setActiveModal(null);
      load();
    } catch (e) {
      toast.error((e as ApiError)?.message ?? "Failed to delete user.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!activeUser) return;
    setActionBusy(true);
    try {
      const updated = await enterpriseService.toggleUserStatus(activeUser.id);
      toast.success(`${activeUser.name} is now ${updated.isActive ? "active" : "inactive"}.`);
      setActiveUser(null); setActiveModal(null);
      load();
    } catch (e) {
      toast.error((e as ApiError)?.message ?? "Failed to update status.");
    } finally {
      setActionBusy(false);
    }
  };

  const adminUsable    = creditSummary?.adminUsable ?? 0;
  const creditBalance  = overview?.enterprise.creditBalance ?? 0;
  const creditsUsed    = overview?.enterprise.creditsUsed ?? 0;
  const activeCount    = overview?.users.active ?? 0;
  const totalCount     = overview?.users.total ?? users.length;
  const availableForEdit = activeUser ? adminUsable + (activeUser.creditLimit ?? 0) : adminUsable;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enterprise Users"
        subtitle="Manage members and credit allocations for your enterprise."
      />

      <div className="px-4 lg:px-6 space-y-4">

        {/* ── Stat tiles ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Total Members"  value={totalCount}                     icon={Users}     iconBg="bg-blue-50"    iconColor="text-blue-600"    loading={loading} />
          <StatTile label="Active Members" value={activeCount}                    icon={UserCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} />
          <StatTile label="Credit Balance" value={creditBalance.toLocaleString()} icon={Wallet}    iconBg="bg-violet-50"  iconColor="text-violet-600"  loading={loading} />
          <StatTile label="Credits Used"   value={creditsUsed.toLocaleString()}   icon={Activity}  iconBg="bg-orange-50"  iconColor="text-orange-500"  loading={loading} />
        </div>

        {/* ── Credit pool summary ── */}
        {creditSummary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Total Purchased"    value={creditSummary.totalPurchased.toLocaleString()} icon={TrendingUp}  iconBg="bg-blue-50"    iconColor="text-blue-600"    loading={false} />
            <StatTile label="Allocated to Users" value={creditSummary.totalAllocated.toLocaleString()} icon={PieChart}    iconBg="bg-purple-50"  iconColor="text-purple-600"  loading={false} />
            <StatTile label="Used by Users"      value={creditSummary.totalUsed.toLocaleString()}      icon={BarChart2}   iconBg="bg-orange-50"  iconColor="text-orange-500"  loading={false} />
            <StatTile label="Admin Usable"       value={creditSummary.adminUsable.toLocaleString()}    icon={ShieldCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={false} />
          </div>
        )}

        {/* ── Members table ── */}
        <Card>
          <CardContent className="pt-3 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold">Members</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {loading ? "Loading…" : `${users.length} member${users.length !== 1 ? "s" : ""} in your enterprise`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setAddExistingOpen(true)}>
                  <UserPlus size={13} /> Add Existing User
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5 gradient-brand border-0 text-white hover:opacity-90" onClick={() => setCreateOpen(true)}>
                  <Plus size={13} /> Create New User
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              {loading ? (
                <div className="space-y-0">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4 border-b border-border/50 last:border-0 px-3 py-3">
                      <Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-44" />
                      <Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-center text-sm text-destructive">{error}</div>
              ) : users.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No members yet. Use the buttons above to add users.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Name", "Email", "Role", "Status", "Allocated", "Used", "Remaining", "Expires", "Added", ""].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => {
                      const isAdmin   = u.role === "ENTERPRISE_ADMIN";
                      const allocated = u.creditLimit ?? null;
                      const used      = u.creditsUsed ?? 0;
                      const remaining = allocated !== null ? Math.max(0, allocated - used) : null;
                      return (
                        <tr
                          key={u.id}
                          className={cn(
                            "border-b border-border last:border-0 transition-colors hover:bg-muted/20",
                            i % 2 === 1 && "bg-muted/10",
                          )}
                        >
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">{u.name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground text-xs">{u.email}</td>
                          <td className="px-3 py-2.5"><RoleBadge role={u.role} /></td>
                          <td className="px-3 py-2.5"><StatusBadge active={u.isActive} /></td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {allocated !== null
                              ? <span className="font-medium">{allocated.toLocaleString()}</span>
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{used.toLocaleString()}</td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {remaining !== null ? (
                              <span className={cn("font-medium", remaining === 0 ? "text-red-500" : "text-emerald-600")}>
                                {remaining.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {u.creditExpiresAt ? new Date(u.creditExpiresAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="px-3 py-2.5">
                            {!isAdmin && (
                              <ActionMenu user={u} onAction={(modal) => openAction(u, modal)} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Static dialogs ── */}
      <CreateEnterpriseUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        availableCredits={adminUsable}
      />
      <AddExistingUserDialog
        open={addExistingOpen}
        onClose={() => setAddExistingOpen(false)}
        onAdded={handleAdded}
      />

      {/* ── Action modals ── */}
      {activeUser && activeModal?.type === "credits" && (
        <AllocateCreditDialog user={activeUser} available={availableForEdit} onClose={closeModal} onSaved={load} />
      )}

      {activeUser && activeModal?.type === "edit" && (
        <EditUserModal
          user={activeUser}
          onClose={closeModal}
          onSaved={(updated) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))}
        />
      )}

      {activeUser && activeModal?.type === "password" && (
        <ChangePasswordModal user={activeUser} onClose={closeModal} />
      )}

      {/* ── Confirmation dialogs ── */}
      <ConfirmDialog
        open={!!activeUser && activeModal?.type === "delete"}
        icon={AlertTriangle}
        iconBg="bg-red-50"
        iconColor="text-red-600"
        title="Delete User"
        description="This action will block their login immediately."
        body={
          activeUser && (
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{activeUser.name}</span>{" "}
              <span className="text-xs">({activeUser.email})</span>?{" "}
              Their account will be deactivated and they will no longer be able to sign in.
            </p>
          )
        }
        confirmLabel="Delete"
        confirmClassName="bg-red-600 hover:bg-red-700"
        busy={actionBusy}
        onConfirm={handleDelete}
        onClose={closeModal}
      />

      <ConfirmDialog
        open={!!activeUser && activeModal?.type === "status"}
        icon={activeUser?.isActive ? UserX : UserCheck2}
        iconBg={activeUser?.isActive ? "bg-amber-50" : "bg-emerald-50"}
        iconColor={activeUser?.isActive ? "text-amber-600" : "text-emerald-600"}
        title={activeUser?.isActive ? "Deactivate User" : "Activate User"}
        description={
          activeUser?.isActive
            ? "Their login will be blocked until reactivated."
            : "This will restore their access to the platform."
        }
        body={
          activeUser && (
            <p>
              {activeUser.isActive ? (
                <>
                  Deactivating{" "}
                  <span className="font-semibold text-foreground">{activeUser.name}</span>{" "}
                  will prevent them from signing in. Their data and credit allocation will be preserved.
                  You can reactivate them at any time.
                </>
              ) : (
                <>
                  Activating{" "}
                  <span className="font-semibold text-foreground">{activeUser.name}</span>{" "}
                  will restore their ability to sign in and use their allocated credits.
                </>
              )}
            </p>
          )
        }
        confirmLabel={activeUser?.isActive ? "Deactivate" : "Activate"}
        confirmClassName={activeUser?.isActive ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}
        busy={actionBusy}
        onConfirm={handleToggleStatus}
        onClose={closeModal}
      />
    </div>
  );
}
