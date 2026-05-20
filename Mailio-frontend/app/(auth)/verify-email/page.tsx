import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/src/features/auth/components/AuthShell";
import { VerifyEmailForm } from "@/src/features/auth/components/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify email · Mailio.ai",
  description: "Confirm your email address to activate your Mailio.ai account.",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
