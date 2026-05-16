import { ProfileForm } from "./ProfileForm";
import { ProfileCard } from "@/src/components/ProfileCard";

export function ProfileView() {
  return (
    <div className="max-w-2xl space-y-4">
      <ProfileForm />
      {/* Live account data sourced from GET /users/me */}
      <ProfileCard />
    </div>
  );
}
