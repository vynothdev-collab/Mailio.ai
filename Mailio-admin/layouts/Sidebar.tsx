"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  Tag,
  Coins,
  BarChart3,
  CalendarClock,
  FileText,
  MessageSquare,
  Ticket,
  Settings,
  X,
} from "lucide-react";
import Image from "next/image";
import { NAV_LINKS } from "@/constants";

const ICON_MAP = {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  Tag,
  Coins,
  BarChart3,
  CalendarClock,
  FileText,
  MessageSquare,
  Ticket,
  Settings,
} as const;

interface Props {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: Props) {
  const pathname = usePathname();

  const content = (
    <>
      {/* Logo area */}
      <div className="h-14 sm:h-16 lg:h-[72px] flex items-center justify-between px-4 lg:px-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center min-w-0 flex-1">
          <Image
            src="/brand-logo-white.svg"
            alt="emailanswers.ai"
            width={148}
            height={34}
            className="h-7 lg:h-8 w-auto object-contain"
            priority
          />
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const Icon = ICON_MAP[link.icon as keyof typeof ICON_MAP];
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-primary-600 text-white shadow-md shadow-primary-900/30"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {Icon && (
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}
                />
              )}
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom spacer */}
      <div className="h-4 flex-shrink-0" />
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-sidebar">
        {content}
      </aside>

      {/* Mobile overlay sidebar */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="relative w-60 max-w-[80vw] flex flex-col h-full shadow-2xl bg-sidebar">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
