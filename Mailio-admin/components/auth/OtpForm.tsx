"use client";

import { useState, useRef, useEffect } from "react";
import { authService } from "@/services/auth.service";
import { OTP_RESEND_COOLDOWN } from "@/constants";
import { cn } from "@/lib/utils";
import type { VerifyOtpResponse } from "@/types";

interface OtpFormProps {
  email: string;
  onSuccess: (data: VerifyOtpResponse) => void;
  onBack: () => void;
}

const OTP_LENGTH = 6;

export default function OtpForm({ email, onSuccess, onBack }: OtpFormProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(OTP_RESEND_COOLDOWN);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index: number, raw: string) {
    setError("");
    const value = raw.replace(/\D/g, "");
    if (!value) { setDigitAt(index, ""); return; }

    if (value.length === 1) {
      setDigitAt(index, value);
      inputsRef.current[index + 1]?.focus();
      return;
    }
    const chars = value.slice(0, OTP_LENGTH - index).split("");
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((c, i) => { next[index + i] = c; });
      return next;
    });
    inputsRef.current[Math.min(index + chars.length, OTP_LENGTH - 1)]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setDigitAt(index - 1, "");
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const chars = text.split("");
    setDigits(() => {
      const next = Array(OTP_LENGTH).fill("");
      chars.forEach((c, i) => { next[i] = c; });
      return next;
    });
    inputsRef.current[Math.min(chars.length, OTP_LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await authService.verifyOtp({ email, otp });
      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0 || resendLoading) return;
    setResendLoading(true);
    setError("");
    try {
      await authService.resendOtp({ email });
      setCountdown(OTP_RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* Heading */}
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Verify your identity
        </h2>
        <p className="text-xs leading-relaxed text-text-secondary sm:text-sm">
          Enter the 6-digit code we sent to{" "}
          <span className="font-medium text-text-primary break-all">{email}</span>
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-primary sm:text-sm">
            Verification code
          </label>

          {/* OTP inputs */}
          <div className="flex justify-between gap-1.5 sm:gap-3" onPaste={handlePaste}>
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
                aria-label={`Digit ${i + 1}`}
                disabled={loading}
                className={cn(
                  "h-11 w-9 rounded-lg border bg-white text-center text-lg font-semibold text-text-primary transition",
                  "focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "sm:h-14 sm:w-12 sm:text-2xl",
                  d ? "border-[#2563eb]" : "border-gray-200"
                )}
              />
            ))}
          </div>

          {/* Resend */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resendLoading}
              className="text-xs font-medium text-[#2563eb] hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline sm:text-sm transition-colors"
            >
              {resendLoading
                ? "Sending…"
                : countdown > 0
                  ? `Resend code in ${countdown}s`
                  : "Resend code"}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || digits.join("").length < OTP_LENGTH}
          className="h-11 w-full rounded-lg bg-[#162D3A] text-sm font-medium text-white hover:bg-[#0e1f29] disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:h-12 sm:text-base flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Verifying…
            </>
          ) : (
            "Verify & Sign in"
          )}
        </button>
      </form>

      {/* Back link */}
      <p className="text-center text-xs text-text-muted sm:text-sm">
        Wrong email?{" "}
        <button
          type="button"
          onClick={onBack}
          className="font-semibold text-[#2563eb] hover:underline"
        >
          Go back
        </button>
      </p>
    </div>
  );
}
