import type { Metadata } from "next";
import { DashboardView } from "@/src/features/dashboard/components/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard · Mailio.ai",
  description: "Email Verification Dashboard – clean lists, reduce bounces.",
};

export default function DashboardPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Email Verification Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Clean your lists, reduce bounce rates, and improve deliverability before every outreach.
        </p>
      </div>

      <DashboardView />
    </>
  );
}
