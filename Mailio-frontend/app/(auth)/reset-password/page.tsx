import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/src/features/auth/components/AuthShell";
import { ResetPasswordForm } from "@/src/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password · Mailio.ai",
  description: "Set a new password for your Mailio.ai account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
