"use client";

import { LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/src/hooks/useAuth";
import type { ApiError } from "@/src/types/auth";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function ProfileCard() {
  const { user, loading, error, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading profile…
        </CardContent>
      </Card>
    );
  }

  if (error || !user) {
    return (
      <Card>
        <CardContent className="pt-3 text-sm text-destructive">
          {error ?? "Unable to load profile."}
        </CardContent>
      </Card>
    );
  }

  const tiles: { label: string; value: string; emphasis?: boolean }[] = [
    { label: "Name",         value: user.name                                                  },
    { label: "Email",        value: user.email                                                 },
    { label: "Plan",         value: user.plan                                                  },
    { label: "Status",       value: user.isActive ? "Active" : "Inactive", emphasis: user.isActive },
    { label: "Member Since", value: formatDate(user.createdAt)                                  },
    { label: "Last Updated", value: formatDate(user.updatedAt)                                  },
  ];

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      toast.success("You've been signed out.");
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Logout failed.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-3 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live data from /users/me</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {tiles.map(({ label, value, emphasis }) => (
            <div key={label} className="rounded-xl border border-border bg-muted/30 px-3 py-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
              {label === "Status" ? (
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${emphasis ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${emphasis ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  {value}
                </span>
              ) : (
                <p className="text-sm font-semibold truncate">{value}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={signingOut}
            className="gap-2 text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
