"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/src/hooks/useAuth";
import { userService } from "@/src/services/userService";
import type { UserProfile } from "@/src/types/user";
import type { ApiError } from "@/src/types/auth";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function ProfileForm({ user, onSaved, onLogout }: { user: UserProfile; onSaved: () => Promise<unknown>; onLogout: () => Promise<void> }) {
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
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0B47CF] text-white text-base font-bold select-none">
          {initials(user.name)}
        </div>
        <div>
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <span className="mt-1 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 capitalize">
            {user.plan}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <Input value={user.email} readOnly disabled className="h-9 text-sm bg-muted/50 cursor-not-allowed" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Plan</label>
          <Input value={user.plan} readOnly disabled className="h-9 text-sm bg-muted/50 cursor-not-allowed capitalize" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Member Since</label>
          <Input value={formatDate(user.createdAt)} readOnly disabled className="h-9 text-sm bg-muted/50 cursor-not-allowed" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
        >
          {loggingOut
            ? <><Loader2 size={14} className="animate-spin" /> Signing out…</>
            : <><LogOut size={14} /> Sign Out</>
          }
        </Button>

        <Button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="gradient-brand border-0 text-white hover:opacity-90 text-sm disabled:opacity-40"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Changes"}
        </Button>
      </div>
    </>
  );
}

export function ProfileDetailsCard() {
  const { user, loading, refresh, logout } = useAuth();

  return (
    <Card>
      <CardContent className="pt-3 space-y-5">
        <div>
          <h2 className="text-sm font-semibold">Profile Details</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your personal information tied to this account.</p>
        </div>

        {loading && !user ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 size={14} className="animate-spin" /> Loading profile…
          </div>
        ) : user ? (
          <ProfileForm key={user.id} user={user} onSaved={refresh} onLogout={logout} />
        ) : (
          <p className="text-sm text-muted-foreground">Could not load profile.</p>
        )}
      </CardContent>
    </Card>
  );
}
