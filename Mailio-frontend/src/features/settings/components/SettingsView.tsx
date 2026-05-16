import { PasswordSecurityCard } from "./PasswordSecurityCard";
import { NotificationsCard } from "./NotificationsCard";
import { DangerZoneCard } from "./DangerZoneCard";

export function SettingsView() {
  return (
    <div className="max-w-2xl space-y-4">
      <PasswordSecurityCard />
      <NotificationsCard />
      <DangerZoneCard />
    </div>
  );
}
