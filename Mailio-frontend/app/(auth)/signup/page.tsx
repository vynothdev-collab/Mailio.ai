import type { Metadata } from "next";
import { AuthShell } from "@/src/features/auth/components/AuthShell";
import { SignupForm } from "@/src/features/auth/components/SignupForm";

export const metadata: Metadata = {
  title: "Create account · Mailio.ai",
  description: "Create a free Mailio.ai account.",
};

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
