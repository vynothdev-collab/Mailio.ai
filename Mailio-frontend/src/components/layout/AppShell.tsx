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
      </div>
    </div>
  );
}
