import type { Metadata } from "next";
import { AuthShell } from "@/src/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/src/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password · emailanswers.ai",
  description: "Reset your emailanswers.ai account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
