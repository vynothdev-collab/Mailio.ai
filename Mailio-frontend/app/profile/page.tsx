import type { Metadata } from "next";
import { ProfileView } from "@/src/features/profile/components/ProfileView";

export const metadata: Metadata = {
  title: "Profile · emailanswers.ai",
  description: "Manage your personal profile and account information.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
