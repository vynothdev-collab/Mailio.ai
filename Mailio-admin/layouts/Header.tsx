"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, User } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { COOKIE_NAMES, PAGE_META, ROUTES } from "@/constants";
import { getCookie } from "@/lib/cookies";
import type { AdminUser } from "@/types";

interface Props {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const meta =
    PAGE_META[pathname] ??
    Object.entries(PAGE_META).find(([href]) => pathname.startsWith(`${href}/`))?.[1] ??
    { title: "", subtitle: "" };

  useEffect(() => {
    const raw = getCookie(COOKIE_NAMES.USER);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push(ROUTES.LOGIN);
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "AD";

  return (
    <header className="h-16 sm:h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-3 sm:px-6 lg:px-8 flex-shrink-0 gap-3">
      {/* Left: Hamburger (mobile) + Logo (mobile) + Title */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-gray-50 flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="lg:hidden flex-shrink-0">
          <Image src="/brand-icon.svg" alt="Mailio" width={28} height={25} className="w-7 h-auto" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-xl lg:text-2xl font-bold text-text-primary tracking-tight leading-tight truncate">
            {meta.title}
          </h1>
          {meta.subtitle && (
            <p className="hidden sm:block text-xs lg:text-sm text-text-muted mt-0.5 truncate">
              {meta.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: User dropdown */}
      <div className="flex items-center flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2 sm:gap-2.5 p-1 sm:p-1.5 sm:pr-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-text-primary leading-tight">{user?.name ?? "Admin User"}</p>
            <p className="text-[11px] text-text-muted leading-tight">{user?.role ?? "Super Admin"}</p>
          </div>
          <ChevronDown className={`hidden md:block w-4 h-4 text-text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-3 sm:right-6 lg:right-8 top-[60px] sm:top-[68px] w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-text-primary truncate">{user?.name ?? "Admin User"}</p>
              <p className="text-[11px] text-text-muted truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={() => { setDropdownOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4" /> My Profile
            </button>
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
