import type { Metadata } from "next";
import { ProfileView } from "@/src/features/profile/components/ProfileView";

export const metadata: Metadata = {
  title: "Profile · Mailio.ai",
  description: "Manage your personal profile and account information.",
};

export default function ProfilePage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal info and account details.
        </p>
      </div>
      <ProfileView />
    </>
  );
}
