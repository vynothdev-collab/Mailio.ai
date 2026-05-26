"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import OtpForm from "@/components/auth/OtpForm";
import { ROUTES } from "@/constants";
import type { VerifyOtpResponse } from "@/types";

type Step = "login" | "otp";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [settingSession, setSettingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const router = useRouter();

  function handleLoginSuccess(submittedEmail: string) {
    setEmail(submittedEmail);
    setStep("otp");
  }

  async function handleOtpSuccess(data: VerifyOtpResponse) {
    setSettingSession(true);
    setSessionError("");
    try {
      const res = await fetch("/api/auth/set-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: data.accessToken,
          sessionToken: data.sessionToken,
          user: data.user,
        }),
      });
      if (!res.ok) throw new Error();
      router.push(ROUTES.DASHBOARD);
    } catch {
      setSessionError("Something went wrong while signing you in. Please try again.");
      setSettingSession(false);
    }
  }

  if (settingSession) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <div className="h-8 w-8 border-2 border-[#0B47CF] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">Signing you in…</p>
      </div>
    );
  }

  return (
    <>
      {sessionError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {sessionError}
        </div>
      )}

      {step === "login" ? (
        <LoginForm onSuccess={handleLoginSuccess} />
      ) : (
        <OtpForm
          email={email}
          onSuccess={handleOtpSuccess}
          onBack={() => setStep("login")}
        />
      )}
    </>
  );
}
