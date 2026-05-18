"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, LogOut, User, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/hooks/useAuth";
import type { ApiError } from "@/src/types/auth";
import { MobileMenuButton } from "./Sidebar";
import { NotificationDropdown } from "./NotificationDropdown";

function AvatarDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen]           = useState(false);
  const [loggingOut, setLogout]   = useState(false);
  const ref    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSignOut() {
    if (loggingOut) return;
    setLogout(true);
    try {
      await logout();
      toast.success("You've been signed out.");
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Logout failed, but your session was cleared.");
    } finally {
      setOpen(false);
      setLogout(false);
    }
  }

  const initials =
    (user?.name ?? "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="gap-1.5 px-2"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-brand text-white text-[10px] font-bold select-none">
          {initials}
        </div>
        <ChevronDown size={13} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border bg-card py-1 shadow-lg z-50">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold truncate">{user?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted transition-colors"
          >
            <User size={13} className="text-muted-foreground" /> Profile
          </Link>

          <button className="flex w-full items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted transition-colors">
            <HelpCircle size={13} className="text-muted-foreground" /> Help & Support
          </button>

          <div className="border-t border-border mt-1">
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loggingOut ? (
                <><Loader2 size={13} className="animate-spin" /> Signing out…</>
              ) : (
                <><LogOut size={13} /> Sign out</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <MobileMenuButton onClick={onMenuClick} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <NotificationDropdown />
        <AvatarDropdown />
      </div>
    </header>
  );
}
