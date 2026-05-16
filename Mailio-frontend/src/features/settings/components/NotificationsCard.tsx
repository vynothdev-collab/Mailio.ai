"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { MOCK_NOTIFICATION_PREFS } from "../mock";
import type { NotificationPrefs } from "../types";

const TOGGLES: { key: keyof NotificationPrefs; label: string; sub: string }[] = [
  { key: "bulkJobComplete", label: "Bulk job complete",      sub: "Notify me when a bulk verification job finishes."       },
  { key: "quotaAt80",       label: "Quota at 80%",           sub: "Alert me when I've used 80% of my monthly quota."       },
  { key: "quotaAt95",       label: "Quota at 95%",           sub: "Alert me when I'm close to hitting my monthly limit."   },
  { key: "weeklySummary",   label: "Weekly usage summary",   sub: "Receive a weekly email with my verification stats."     },
];

export function NotificationsCard() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(MOCK_NOTIFICATION_PREFS);

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  function handleSave() {
    toast.success("Notification preferences saved.");
  }

  return (
    <Card>
      <CardContent className="pt-3 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Bell size={14} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Notifications</h2>
            <p className="text-xs text-muted-foreground">Choose which emails you receive.</p>
          </div>
        </div>

        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {TOGGLES.map(({ key, label, sub }) => (
            <div key={key} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                role="switch"
                aria-checked={prefs[key]}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  prefs[key] ? "bg-primary" : "bg-muted"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                  prefs[key] ? "translate-x-4" : "translate-x-0"
                )} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="gradient-brand border-0 text-white hover:opacity-90 text-sm"
          >
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
