"use client";

import { Bell } from "lucide-react";

export function NotificationDropdown() {
  return (
    <button
      type="button"
      disabled
      aria-label="Notifications (disabled)"
      title="Notifications are disabled"
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground opacity-50 cursor-not-allowed"
    >
      <Bell size={16} />
    </button>
  );
}
