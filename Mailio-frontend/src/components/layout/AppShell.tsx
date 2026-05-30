"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileMenuContext } from "./mobile-menu-context";
import { FloatingChatbot } from "@/src/components/common/FloatingChatbot";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerCount, setHeaderCount] = useState(0);
  const countRef = useRef(0);

  const openMobile  = useCallback(() => setMobileOpen(true),  []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const registerHeader = useCallback(() => {
    countRef.current += 1;
    setHeaderCount(countRef.current);
    return () => {
      countRef.current -= 1;
      setHeaderCount(countRef.current);
    };
  }, []);

  const ctx = useMemo(
    () => ({ openMobile, registerHeader, hasHeader: headerCount > 0 }),
    [openMobile, registerHeader, headerCount],
  );

  return (
    <MobileMenuContext.Provider value={ctx}>
      <div className="flex h-full bg-[#EEF3FB]">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />
        <div className="flex flex-1 flex-col overflow-hidden">
          {headerCount === 0 && <Navbar onMenuClick={openMobile} />}
          <main id="main-content" role="main" className="flex-1 overflow-y-auto px-4 pb-4 lg:px-6 lg:pb-6">
            {children}
          </main>
        </div>
        <FloatingChatbot />
      </div>
    </MobileMenuContext.Provider>
  );
}
