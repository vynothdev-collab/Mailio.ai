"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell, ChevronDown, HelpCircle, Loader2, LogOut, RefreshCw, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/hooks/useAuth";
import type { ApiError } from "@/src/types/auth";
import { useMobileMenu } from "./mobile-menu-context";
import { MobileMenuButton } from "./Sidebar";
import { BrandMark } from "./BrandMark";

function NotificationButton() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#DCE6F3] bg-white text-[#8B847A] hover:bg-[#F4F8FF] transition-colors"
    >
      <Bell size={15} />
      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#0F5BFF]" aria-hidden />
    </button>
  );
}

function AvatarMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function signOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      toast.success("You've been signed out.");
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Logout failed.");
    } finally {
      setOpen(false);
      setLoggingOut(false);
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full border border-[#DCE6F3] bg-white pl-0.5 pr-2 py-0.5 hover:bg-[#F4F8FF] transition-colors"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F5BFF] text-[11px] font-bold text-white">
          {initials}
        </span>
        <ChevronDown size={13} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-[#DCE6F3] bg-white py-1 shadow-lg">
          <div className="border-b border-[#DCE6F3] px-3 py-2">
            <p className="truncate text-xs font-semibold">{user?.name ?? "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted transition-colors"
          >
            <User size={13} className="text-muted-foreground" /> Profile
          </Link>
          <button className="flex w-full items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted transition-colors">
            <HelpCircle size={13} className="text-muted-foreground" /> Help &amp; Support
          </button>
          <div className="mt-1 border-t border-[#DCE6F3]">
            <button
              onClick={signOut}
              disabled={loggingOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? <><Loader2 size={13} className="animate-spin" /> Signing out…</> : <><LogOut size={13} /> Sign out</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function PageHeader({ title, subtitle, onRefresh, refreshing = false }: PageHeaderProps) {
  const mobileMenu = useMobileMenu();
  useEffect(() => {
    if (!mobileMenu) return;
    return mobileMenu.registerHeader();
  }, [mobileMenu]);
  return (
    <div className="sticky top-0 z-30 -mx-4 flex flex-col gap-3 bg-[#EEF3FB] px-4 py-3 lg:-mx-6 lg:flex-row lg:items-start lg:justify-between lg:px-6 lg:py-4">
      <div className="order-2 min-w-0 flex-1 lg:order-1">
        <h1 className="text-xl font-bold tracking-tight text-[#111827] sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
        )}
      </div>
      <div className="order-1 flex shrink-0 items-center gap-2 lg:order-2 lg:justify-end">
        {mobileMenu && (
          <div className="mr-auto flex items-center gap-2 lg:hidden">
            <MobileMenuButton onClick={mobileMenu.openMobile} />
            <BrandMark className="h-8 w-auto" />
          </div>
        )}
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRefresh()}
            disabled={refreshing}
            className="h-9 gap-1.5 rounded-full border-[#DCE6F3] bg-white px-4 text-sm font-medium text-[#161514] hover:bg-[#F4F8FF]"
          >
            <RefreshCw size={13} className={cn(refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        )}
        <NotificationButton />
        <AvatarMenu />
      </div>
    </div>
  );
}
