"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

interface AppShellProps {
  children: React.ReactNode;
}

// AuthProvider used to live here, but each protected route has its own
// layout.tsx that wraps content in AppShell. Navigating between routes
// remounted AppShell → AuthProvider → triggered /users/me on every nav.
// The provider now lives in app/layout.tsx (root) so it survives all
// navigations and fetches the user exactly once per page load.
export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobile  = useCallback(() => setMobileOpen(true),  []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-full overflow-hidden bg-canvas">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={openMobile} />
        <main id="main-content" role="main" className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
