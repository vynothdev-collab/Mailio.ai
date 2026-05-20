"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/src/services/authService";
import type { ApiError } from "@/src/types/auth";

interface VerifyFormData {
  email: string;
  otp:   string;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillEmail = params.get("email") ?? "";

  const [submitting, setSubmitting] = useState(false);
  const [resending,  setResending]  = useState(false);
  const [cooldown,   setCooldown]   = useState(0);
  const timerRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormData>({
    defaultValues: { email: prefillEmail, otp: "" },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const onSubmit = async (data: VerifyFormData) => {
    setSubmitting(true);
    try {
      await authService.verifyEmail({ email: data.email, otp: data.otp });
      toast.success("Email verified. You can now sign in.");
      router.push("/login");
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Verification failed. Please try again.");
      setSubmitting(false);
    }
  };

  const handleResend = async (email: string) => {
    if (!email) {
      toast.error("Enter your email to receive a new code.");
      return;
    }
    if (cooldown > 0) return;
    setResending(true);
    try {
      const res = await authService.resendVerificationOtp({ email });
      toast.success(res.message ?? "Verification code sent.");
      startCooldown();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Could not resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Verify your email</h2>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code we sent to your inbox to activate your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="verify-email" className="text-sm font-medium">Email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="verify-email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              className="pl-9 h-10"
              {...register("email", {
                required: "Email is required.",
                pattern:  { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." },
              })}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="verify-otp" className="text-sm font-medium">Verification code</label>
          <div className="relative">
            <ShieldCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="verify-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              aria-invalid={!!errors.otp}
              className="pl-9 h-10 tracking-[0.5em] font-mono"
              {...register("otp", {
                required: "Enter the 6-digit code.",
                pattern: { value: /^\d{6}$/, message: "Code must be 6 digits." },
              })}
            />
          </div>
          {errors.otp && <p className="text-xs text-destructive">{errors.otp.message}</p>}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full gradient-brand border-0 text-white hover:opacity-90 h-10"
        >
          {submitting ? (
            <><Loader2 size={15} className="animate-spin" /> Verifying…</>
          ) : (
            "Verify email"
          )}
        </Button>

        <ResendButton
          cooldown={cooldown}
          resending={resending}
          onClick={() => {
            const emailInput = (document.getElementById("verify-email") as HTMLInputElement | null);
            void handleResend(emailInput?.value?.trim() ?? "");
          }}
        />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already verified?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function ResendButton({
  cooldown, resending, onClick,
}: {
  cooldown:  number;
  resending: boolean;
  onClick:   () => void;
}) {
  const disabled = cooldown > 0 || resending;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-sm text-muted-foreground hover:text-foreground disabled:opacity-60 transition-colors"
    >
      {resending
        ? "Sending…"
        : cooldown > 0
          ? `Resend code in ${cooldown}s`
          : "Resend verification code"}
    </button>
  );
}
