import type { Metadata } from "next";
import { DashboardView } from "@/src/features/dashboard/components/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard · Mailio.ai",
  description: "Email Verification Dashboard – clean lists, reduce bounces.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
