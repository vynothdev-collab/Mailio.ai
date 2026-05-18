"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, memo } from "react";
import {
  LayoutDashboard, Mail, MailOpen, BarChart3,
  TrendingUp, CreditCard, Settings,
  ChevronLeft, ChevronRight, X, Menu,
} from "lucide-react";

function MailioLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 3L10 14"
        stroke="#F54B64"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3L14 21L10 14L3 10L21 3Z"
        stroke="#F54B64"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";
import { NAV_ITEMS } from "@/src/features/dashboard/constants";
import type { NavItem } from "@/src/features/dashboard/types";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Mail, MailOpen, BarChart3,
  TrendingUp, CreditCard, Settings,
};

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

const NavLink = memo(({ item, isActive, collapsed }: NavLinkProps) => {
  const Icon = ICON_MAP[item.iconName] ?? Mail;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
});
NavLink.displayName = "NavLink";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);

  const content = (
    <div className="flex h-full flex-col">
      
      <div className={cn(
        "flex items-center border-b border-border px-4 py-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-0">
            <MailioLogo size={26} />
            <span className="text-xl font-extrabold tracking-tight text-slate-800">
              mailio.ai
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard">
            <MailioLogo size={26} />
          </Link>
        )}

        
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleCollapsed}
          className="hidden lg:flex text-muted-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>

        
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onMobileClose}
          className="lg:hidden text-muted-foreground"
          aria-label="Close menu"
        >
          <X size={16} />
        </Button>
      </div>

      
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
            collapsed={collapsed}
          />
        ))}
      </nav>

    </div>
  );

  return (
    <>
      
      <aside className={cn(
        "hidden lg:flex flex-col h-full border-r border-border bg-card transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}>
        {content}
      </aside>

      
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card shadow-xl z-50">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="lg:hidden"
      aria-label="Open navigation menu"
    >
      <Menu size={20} />
    </Button>
  );
}
