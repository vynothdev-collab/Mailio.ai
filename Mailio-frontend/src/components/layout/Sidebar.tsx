"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, memo } from "react";
import { ChevronLeft, ChevronRight, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";
import { NAV_ITEMS } from "@/src/features/dashboard/constants";
import type { NavItem } from "@/src/features/dashboard/types";
import { SIDEBAR_ICONS } from "./SidebarIcons";

function EmailanswersLogo({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/brand-icon.svg" alt="emailanswers.ai" className="h-8 w-auto" draggable={false} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand-logo.svg" alt="emailanswers.ai" className="h-10 w-auto" draggable={false} />
  );
}


interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

const NavLink = memo(({ item, isActive, collapsed }: NavLinkProps) => {
  const Icon = SIDEBAR_ICONS[item.iconName] ?? SIDEBAR_ICONS.dashboard;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-white text-[#161514] shadow-sm"
          : "text-[#8B847A] hover:bg-white/50 hover:text-[#161514]",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon active={isActive} size={18} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
});
NavLink.displayName = "NavLink";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const COLLAPSED_KEY = "mailio.sidebarCollapsed";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.sessionStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
      }
      return next;
    });
  }, []);

  const renderContent = (forceExpanded: boolean) => {
    const isCollapsed = forceExpanded ? false : collapsed;
    return (
      <div className="relative flex h-full flex-col">
        <div className={cn(
          "flex items-center py-4",
          isCollapsed ? "justify-center px-1" : "justify-between px-4"
        )}>
          <div className="flex items-center justify-center">
            <EmailanswersLogo collapsed={isCollapsed} />
          </div>

          {!isCollapsed && !forceExpanded && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleCollapsed}
              className="hidden lg:flex text-muted-foreground"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={14} />
            </Button>
          )}

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

        {isCollapsed && !forceExpanded && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="absolute right-0 top-6 z-50 hidden h-5 w-5 translate-x-1/2 items-center justify-center rounded-full border border-[#DCE6F3] bg-white text-[#8B847A] shadow-sm hover:text-[#161514] lg:flex"
          >
            <ChevronRight size={12} />
          </button>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Main navigation">
          {NAV_ITEMS.map((item, idx) => (
            <div key={item.id}>
              {item.id === "settings" && idx > 0 && (
                <div className="my-2 border-t border-[#DCE6F3] mx-2" aria-hidden />
              )}
              <NavLink
                item={item}
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                collapsed={isCollapsed}
              />
            </div>
          ))}
        </nav>
      </div>
    );
  };

  return (
    <>
      
      <aside
        suppressHydrationWarning
        className={cn(
          "hidden lg:flex flex-col h-full bg-[#EEF3FB] border-r border-[#DCE6F3] transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {renderContent(false)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-[#EEF3FB] shadow-xl z-50">
            {renderContent(true)}
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
