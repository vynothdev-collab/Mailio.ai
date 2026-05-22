import { ProfileDetailsCard } from "./ProfileDetailsCard";
import { PasswordSecurityCard } from "./PasswordSecurityCard";
import { NotificationsCard } from "./NotificationsCard";
import { DangerZoneCard } from "./DangerZoneCard";

export function SettingsView() {
  return (
    <div className="max-w-2xl space-y-4">
      <ProfileDetailsCard />
      <PasswordSecurityCard />
      <NotificationsCard />
      <DangerZoneCard />
    </div>
  );
}
