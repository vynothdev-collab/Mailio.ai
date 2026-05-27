"use client";

import { PageHeader } from "@/src/components/layout/PageHeader";
import { useAuth } from "@/src/hooks/useAuth";
import { ProfileSkeleton } from "@/src/components/shared/Skeleton";
import { ProfileDetailsCard } from "@/src/features/settings/components/ProfileDetailsCard";

export function ProfileView() {
  const { refresh, loading } = useAuth();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profile"
        subtitle="Manage your personal info and account details."
        onRefresh={refresh}
        refreshing={loading}
      />
      <div className="max-w-2xl">
        {loading ? <ProfileSkeleton /> : <ProfileDetailsCard />}
      </div>
    </div>
  );
}
