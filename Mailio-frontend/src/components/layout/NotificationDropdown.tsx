"use client";

// Notification bell — currently disabled (no data source). The dropdown,
// unread badge, and mock list have been removed; the icon remains as a
// visual placeholder so the navbar layout stays consistent.

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
