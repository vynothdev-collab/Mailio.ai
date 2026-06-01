import type { Metadata } from "next";
import { EnterpriseUsersPageClient } from "@/src/features/enterprise/components/EnterpriseUsersPageClient";

export const metadata: Metadata = {
  title: "Enterprise Users · emailanswers.ai",
  description: "Manage members of your enterprise account.",
};

export default function EnterpriseUsersPage() {
  return <EnterpriseUsersPageClient />;
}
