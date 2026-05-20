"use client";

import { MobileMenuButton } from "./Sidebar";

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 bg-[#EEF3FB] px-4 lg:hidden lg:px-6">
      <MobileMenuButton onClick={onMenuClick} />
    </header>
  );
}
