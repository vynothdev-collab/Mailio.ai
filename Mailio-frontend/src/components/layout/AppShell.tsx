"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobile  = useCallback(() => setMobileOpen(true),  []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-full bg-[#EEF3FB]">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={openMobile} />
        <main id="main-content" role="main" className="flex-1 overflow-y-auto px-4 pb-4 lg:px-6 lg:pb-6">
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 bg-[#EEF3FB] px-4 py-2.5 text-xs text-muted-foreground lg:px-6">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>All systems operational</span>
      </div>
      <div>© {new Date().getFullYear()} Emailanswers.ai · Synced just now</div>
    </footer>
  );
}
