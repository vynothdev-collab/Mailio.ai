"use client";

import { PageHeader } from "@/src/components/layout/PageHeader";
import { useAuth } from "@/src/hooks/useAuth";
import { SettingsSkeleton } from "@/src/components/shared/Skeleton";
import { ProfileDetailsCard } from "./ProfileDetailsCard";
import { PasswordSecurityCard } from "./PasswordSecurityCard";

export function SettingsView() {
  const { refresh, loading } = useAuth();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="Manage your security and account preferences."
        onRefresh={refresh}
        refreshing={loading}
      />
      <div className="max-w-2xl space-y-3 sm:space-y-4">
        {loading ? (
          <SettingsSkeleton />
        ) : (
          <>
            <ProfileDetailsCard />
            <PasswordSecurityCard />
          </>
        )}
      </div>
    </div>
  );
}
