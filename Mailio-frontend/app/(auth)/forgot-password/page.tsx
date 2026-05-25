import type { Metadata } from "next";
import { AuthShell } from "@/src/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/src/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password · Mailio.ai",
  description: "Reset your Mailio.ai account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
