import type { Metadata } from "next";
import { SettingsView } from "@/src/features/settings/components/SettingsView";

export const metadata: Metadata = {
  title: "Settings · Mailio.ai",
  description: "Manage your password, API keys, notifications, and account settings.",
};

export default function SettingsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your security, API keys, and notification preferences.
        </p>
      </div>
      <SettingsView />
    </>
  );
}
