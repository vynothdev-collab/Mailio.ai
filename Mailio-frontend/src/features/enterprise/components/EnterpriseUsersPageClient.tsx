"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus, UserPlus, Trash2,
  Users, Wallet, Activity, UserCheck, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { RoleGuard } from "@/src/components/auth/RoleGuard";
import { cn } from "@/src/lib/utils";
import {
  enterpriseService,
  type EnterpriseUser,
  type EnterpriseOverview,
} from "@/src/services/enterpriseService";
import type { ApiError } from "@/src/types/auth";
import { CreateEnterpriseUserDialog } from "./CreateEnterpriseUserDialog";
import { AddExistingUserDialog } from "./AddExistingUserDialog";

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
}: {
  label:      string;
  value:      string | number;
  icon:       React.ElementType;
  iconBg:     string;
  iconColor:  string;
  loading:    boolean;
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
          : <p className="text-xl font-bold tabular-nums">{value}</p>
        }
      </div>
    </div>
  );
}

// ── Role & status badges ──────────────────────────────────────────────────────

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
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [createOpen,      setCreateOpen]      = useState(false);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [removingId,      setRemovingId]      = useState<string | null>(null);
  const [refreshKey,      setRefreshKey]      = useState(0);

  const load = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, ov] = await Promise.all([
          enterpriseService.listUsers(1, 100),
          enterpriseService.getOverview(),
        ]);
        if (controller.signal.aborted) return;
        setUsers(usersRes.data);
        setOverview(ov);
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
    void load();
  }, [load]);

  const handleAdded = useCallback((added: EnterpriseUser) => {
    toast.success(`${added.email} added to your enterprise.`);
    setAddExistingOpen(false);
    void load();
  }, [load]);

  const handleRemove = useCallback(async (user: EnterpriseUser) => {
    if (!confirm(`Remove ${user.name} (${user.email}) from the enterprise?`)) return;
    setRemovingId(user.id);
    try {
      await enterpriseService.removeUser(user.id);
      toast.success(`${user.email} removed from the enterprise.`);
      void load();
    } catch (e) {
      toast.error((e as ApiError)?.message ?? "Failed to remove user.");
    } finally {
      setRemovingId(null);
    }
  }, [load]);

  const creditBalance = overview?.enterprise.creditBalance ?? 0;
  const creditsUsed   = overview?.enterprise.creditsUsed   ?? 0;
  const activeCount   = overview?.users.active ?? 0;
  const totalCount    = overview?.users.total  ?? users.length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enterprise Users"
        subtitle="Manage members of your enterprise — shared credits and permissions."
      />

      <div className="px-4 lg:px-6 space-y-4">

        {/* ── Stat tiles ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Total Members"
            value={totalCount}
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            loading={loading}
          />
          <StatTile
            label="Active Members"
            value={activeCount}
            icon={UserCheck}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            loading={loading}
          />
          <StatTile
            label="Credit Balance"
            value={creditBalance.toLocaleString()}
            icon={Wallet}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            loading={loading}
          />
          <StatTile
            label="Credits Used"
            value={creditsUsed.toLocaleString()}
            icon={Activity}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            loading={loading}
          />
        </div>

        {/* ── Members card ── */}
        <Card>
          <CardContent className="pt-3 space-y-3">

            {/* header row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold">Members</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {loading ? "Loading…" : `${users.length} member${users.length !== 1 ? "s" : ""} in your enterprise`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setAddExistingOpen(true)}
                >
                  <UserPlus size={13} />
                  Add Existing User
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 gradient-brand border-0 text-white hover:opacity-90"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus size={13} />
                  Create New User
                </Button>
              </div>
            </div>

            {/* table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              {loading ? (
                <div className="space-y-0">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4 border-b border-border/50 last:border-0 px-3 py-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
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
                      {["Name", "Email", "Role", "Status", "Credits Used", "Added", ""].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr
                        key={u.id}
                        className={cn(
                          "border-b border-border last:border-0 transition-colors hover:bg-muted/20",
                          i % 2 === 1 && "bg-muted/10",
                        )}
                      >
                        <td className="px-3 py-2.5 font-medium">{u.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{u.email}</td>
                        <td className="px-3 py-2.5">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge active={u.isActive} />
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-medium">
                          {(u.creditsUsed ?? 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2.5">
                          {u.role !== "ENTERPRISE_ADMIN" && (
                            <button
                              type="button"
                              onClick={() => handleRemove(u)}
                              disabled={removingId === u.id}
                              title="Remove from enterprise"
                              className="inline-flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                            >
                              {removingId === u.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Trash2 size={13} />
                              }
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </CardContent>
        </Card>

      </div>

      <CreateEnterpriseUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <AddExistingUserDialog
        open={addExistingOpen}
        onClose={() => setAddExistingOpen(false)}
        onAdded={handleAdded}
      />
    </div>
  );
}
