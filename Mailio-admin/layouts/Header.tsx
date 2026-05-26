"use client";

import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      {/* Mobile logo (hidden on lg+ since sidebar is visible) */}
      <div className="lg:hidden">
        <Image
          src="/brand-logo.svg"
          alt="mailanswer.ai"
          width={140}
          height={32}
          draggable={false}
        />
      </div>
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-text-secondary truncate max-w-[200px]">
          {user?.email}
        </span>

        <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-semibold select-none flex-shrink-0">
          {initials}
        </div>

        <button
          onClick={logout}
          className="text-sm text-text-muted hover:text-red-500 font-medium transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
