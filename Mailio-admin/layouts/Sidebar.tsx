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
  Headphones,
  ChevronRight,
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
      <div className="h-14 sm:h-16 lg:h-[72px] flex items-center justify-between px-4 lg:px-5 border-b border-gray-100">
        <div className="flex items-center min-w-0 flex-1">
          <Image
            src="/brand-logo.svg"
            alt="Mailio"
            width={148}
            height={34}
            className="h-7 lg:h-11 w-auto object-contain"
            priority
          />
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
          aria-label="Close menu"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      <nav className="flex-1 px-2 lg:px-3 py-3 lg:py-4 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const Icon = ICON_MAP[link.icon as keyof typeof ICON_MAP];
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 lg:gap-3 px-2.5 lg:px-3 py-2 lg:py-2.5 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-text-secondary hover:bg-gray-50 hover:text-text-primary"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" />}
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

    
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-shrink-0 flex-col">
        {content}
      </aside>

      {/* Mobile overlay sidebar */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative w-60 max-w-[80vw] bg-white flex flex-col h-full shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
