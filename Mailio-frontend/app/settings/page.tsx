import type { Metadata } from "next";
import { SettingsView } from "@/src/features/settings/components/SettingsView";

export const metadata: Metadata = {
  title: "Settings · emailanswers.ai",
  description: "Manage your password, API keys, notifications, and account settings.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
