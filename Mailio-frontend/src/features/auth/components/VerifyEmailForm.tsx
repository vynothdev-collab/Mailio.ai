"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/src/services/authService";
import { cn } from "@/src/lib/utils";
import type { ApiError } from "@/src/types/auth";

const OTP_LENGTH = 6;

export function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const timerRef = useRef<number | null>(null);

  const otp = useMemo(() => digits.join(""), [digits]);
  const complete = otp.length === OTP_LENGTH && /^\d{6}$/.test(otp);

  const startTimer = (seconds: number) => {
    setCooldown(seconds);
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

  useEffect(() => {
    inputsRef.current[0]?.focus();
    if (!email) return;

    let cancelled = false;
    authService.getOtpStatus(email)
      .then(({ remainingSeconds }) => {
        if (cancelled) return;
        if (remainingSeconds > 0) startTimer(remainingSeconds);
      })
      .catch(() => {
        if (!cancelled) startTimer(60);
      });

    return () => {
      cancelled = true;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  const setDigitAt = (index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleChange = (index: number, raw: string) => {
    setErrorMessage("");
    const value = raw.replace(/\D/g, "");
    if (!value) {
      setDigitAt(index, "");
      return;
    }
    if (value.length === 1) {
      setDigitAt(index, value);
      inputsRef.current[index + 1]?.focus();
      return;
    }
    const chars = value.slice(0, OTP_LENGTH - index).split("");
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((c, i) => {
        next[index + i] = c;
      });
      return next;
    });
    const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
    inputsRef.current[nextIndex]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setDigitAt(index - 1, "");
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const chars = text.split("");
    setDigits(() => {
      const next = Array(OTP_LENGTH).fill("");
      chars.forEach((c, i) => {
        next[i] = c;
      });
      return next;
    });
    inputsRef.current[Math.min(chars.length, OTP_LENGTH - 1)]?.focus();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Missing email. Please sign up again.");
      return;
    }
    if (!complete) {
      setErrorMessage("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      await authService.verifyEmail({ email, otp });
      toast.success("Email verified. You can now sign in.");
      router.push("/login");
    } catch (err) {
      const apiErr = err as ApiError;
      const msg = apiErr?.message ?? "Verification failed. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Missing email. Please sign up again.");
      return;
    }
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await authService.resendVerificationOtp({ email });
      toast.success(res.message ?? "Verification code sent.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
      const { remainingSeconds } = await authService.getOtpStatus(email);
      if (remainingSeconds > 0) startTimer(remainingSeconds);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Could not resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-7">
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl">
          Verify your email
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Enter the 6-digit code we sent to{" "}
          <span className="font-medium text-foreground break-all">{email || "your email"}</span>
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4 sm:space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground sm:text-sm">Verification code</label>
          <div className="flex justify-between gap-1.5 sm:gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                aria-label={`Digit ${i + 1}`}
                className={cn(
                  "h-11 w-9 rounded-lg border border-input bg-white text-center text-lg font-semibold text-foreground transition sm:h-14 sm:w-12 sm:text-2xl",
                  "focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20",
                  d && "border-[#2563eb]"
                )}
              />
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-xs font-medium text-[#2563eb] hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline sm:text-sm"
            >
              {resending
                ? "Sending…"
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : "Resend code"}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting || !complete}
          className="h-11 w-full rounded-lg bg-[#162D3A] text-sm text-white hover:bg-[#0e1f29] disabled:opacity-60 sm:h-12 sm:text-base"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" /> Verifying…</>
          ) : (
            "Verify email"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground sm:text-sm">
        Already verified?{" "}
        <Link href="/login" className="font-semibold text-[#2563eb] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
