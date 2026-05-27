"use client";

import { useState } from "react";
import { Loader2, LogOut, User, Mail, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/src/hooks/useAuth";
import { userService } from "@/src/services/userService";
import type { UserProfile } from "@/src/types/user";
import type { ApiError } from "@/src/types/auth";

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function ProfileForm({ user, onSaved, onLogout }: {
  user: UserProfile;
  onSaved: () => Promise<unknown>;
  onLogout: () => Promise<void>;
}) {
  const [name,       setName]       = useState(user.name);
  const [saving,     setSaving]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isDirty = name.trim() !== user.name;

  async function handleSave() {
    if (!isDirty || !name.trim()) return;
    setSaving(true);
    try {
      await userService.updateProfile({ name: name.trim() });
      await onSaved();
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await onLogout(); } finally { setLoggingOut(false); }
  }

  return (
    <div className="space-y-5">
      {/* Avatar row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl bg-[#F4F8FF] px-4 py-4">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full bg-[#0B47CF] text-white text-base sm:text-lg font-bold select-none shadow-sm">
          {initials(user.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-semibold text-[#111827] truncate">{user.name}</p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <User size={11} /> Full Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="h-9 sm:h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Mail size={11} /> Email
          </label>
          <Input
            value={user.email}
            readOnly
            disabled
            className="h-9 sm:h-10 text-sm bg-muted/40 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Member Since info row */}
      <div className="flex items-center gap-2.5 rounded-lg border border-[#DCE6F3] bg-[#F4F8FF]/60 px-3 py-2.5">
        <CalendarDays size={14} className="shrink-0 text-muted-foreground" />
        <div className="flex flex-col xs:flex-row xs:items-center gap-0.5 xs:gap-2 min-w-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Member since</span>
          <span className="text-xs sm:text-sm font-medium text-[#111827] truncate">{formatDate(user.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-[#DCE6F3]">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full sm:w-auto gap-2 text-xs sm:text-sm text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
        >
          {loggingOut
            ? <><Loader2 size={13} className="animate-spin" /> Signing out…</>
            : <><LogOut size={13} /> Sign Out</>}
        </Button>

        <Button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="w-full sm:w-auto gradient-brand border-0 text-white hover:opacity-90 text-xs sm:text-sm disabled:opacity-40"
        >
          {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

export function ProfileDetailsCard() {
  const { user, loading, refresh, logout } = useAuth();

  return (
    <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#DCE6F3]">
        <h2 className="text-sm sm:text-base font-semibold text-[#111827]">Profile Details</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Your personal information tied to this account.</p>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-5">
        {loading && !user ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 size={15} className="animate-spin" /> Loading profile…
          </div>
        ) : user ? (
          <ProfileForm key={user.id} user={user} onSaved={refresh} onLogout={logout} />
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Could not load profile.</p>
        )}
      </div>
    </div>
  );
}
