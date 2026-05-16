import type { Metadata } from "next";
import { AuthShell } from "@/src/features/auth/components/AuthShell";
import { LoginForm } from "@/src/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in · Mailio.ai",
  description: "Sign in to your Mailio.ai account.",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
