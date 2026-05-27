"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/hooks/useAuth";
import { userService } from "@/src/services/userService";
import type { ApiError } from "@/src/types/auth";

function PasswordInput({
  label, value, onChange, placeholder, autoComplete = "new-password",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Lock size={11} /> {label}
      </label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          autoComplete={autoComplete}
          className="h-9 sm:h-10 text-sm pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function strengthLabel(pw: string): { label: string; color: string; bg: string; width: string } {
  if (pw.length === 0) return { label: "",       color: "text-transparent", bg: "bg-red-500",     width: "w-0"    };
  if (pw.length < 6)   return { label: "Weak",   color: "text-red-500",     bg: "bg-red-500",     width: "w-1/4"  };
  if (pw.length < 10)  return { label: "Fair",   color: "text-amber-500",   bg: "bg-amber-500",   width: "w-2/4"  };
  if (pw.length < 14)  return { label: "Good",   color: "text-blue-500",    bg: "bg-blue-500",    width: "w-3/4"  };
  return                      { label: "Strong", color: "text-emerald-600", bg: "bg-emerald-500", width: "w-full" };
}

type Step = "form" | "otp";

function PasswordForm({ hasPassword, onOtpSent }: {
  hasPassword: boolean;
  onOtpSent: (current: string, next: string) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);

  const strength = strengthLabel(next);
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSend  = (!hasPassword || current.length > 0) && next.length >= 8 && next === confirm;

  async function handleSendOtp() {
    if (!canSend) return;
    setSending(true);
    try {
      await userService.requestPasswordChangeOtp();
      toast.success("Verification code sent to your email.");
      onOtpSent(current, next);
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Failed to send OTP.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {hasPassword && (
        <PasswordInput label="Current Password" value={current} onChange={setCurrent} />
      )}

      <PasswordInput
        label="New Password"
        value={next}
        onChange={setNext}
        placeholder="Min. 8 characters"
      />

      {next.length > 0 && (
        <div className="space-y-1 -mt-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-300", strength.bg, strength.width)} />
            </div>
            <span className={cn("text-[11px] font-semibold w-10 text-right", strength.color)}>
              {strength.label}
            </span>
          </div>
        </div>
      )}

      <PasswordInput label="Confirm New Password" value={confirm} onChange={setConfirm} />
      {mismatch && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
          Passwords do not match
        </p>
      )}

      <div className="flex justify-end pt-1 border-t border-[#DCE6F3]">
        <Button
          disabled={!canSend || sending}
          onClick={handleSendOtp}
          className="w-full sm:w-auto gradient-brand border-0 text-white hover:opacity-90 text-xs sm:text-sm disabled:opacity-40"
        >
          {sending
            ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
            : <><ShieldCheck size={13} /> Send Verification Code</>}
        </Button>
      </div>
    </div>
  );
}

function OtpStep({ currentPassword, newPassword, onSuccess, onBack }: {
  currentPassword: string;
  newPassword: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [otp,       setOtp]       = useState("");
  const [saving,    setSaving]    = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    if (otp.length !== 6) return;
    setSaving(true);
    try {
      await userService.changePassword({
        currentPassword: currentPassword || undefined,
        newPassword,
        otp,
      });
      toast.success("Password changed successfully.");
      onSuccess();
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Verification failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await userService.requestPasswordChangeOtp();
      toast.success("A new verification code has been sent.");
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-xl bg-[#F4F8FF] border border-[#DCE6F3] px-4 py-3 flex items-start gap-3">
        <ShieldCheck size={16} className="shrink-0 text-[#0B47CF] mt-0.5" />
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          A 6-digit code was sent to{" "}
          <span className="font-semibold text-[#111827]">{user?.email}</span>.
          Enter it below to confirm.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Verification Code</label>
        <Input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="_ _ _ _ _ _"
          className="h-10 sm:h-11 text-base sm:text-lg tracking-[0.4em] text-center font-mono"
          maxLength={6}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-[#DCE6F3]">
        <div className="flex items-center justify-center sm:justify-start gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-xs sm:text-sm text-[#0B47CF] hover:opacity-75 transition-opacity disabled:opacity-40"
          >
            {resending ? "Resending…" : "Resend code"}
          </button>
        </div>
        <Button
          disabled={otp.length !== 6 || saving}
          onClick={handleVerify}
          className="w-full sm:w-auto gradient-brand border-0 text-white hover:opacity-90 text-xs sm:text-sm disabled:opacity-40"
        >
          {saving
            ? <><Loader2 size={13} className="animate-spin" /> Verifying…</>
            : <><ShieldCheck size={13} /> Confirm Change</>}
        </Button>
      </div>
    </div>
  );
}

export function PasswordSecurityCard() {
  const { user } = useAuth();
  const [step,            setStep]            = useState<Step>("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");

  const hasPassword = user?.hasPassword ?? true;

  function handleOtpSent(current: string, next: string) {
    setCurrentPassword(current);
    setNewPassword(next);
    setStep("otp");
  }

  function handleSuccess() {
    setStep("form");
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#DCE6F3]">
        <h2 className="text-sm sm:text-base font-semibold text-[#111827]">Password & Security</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {step === "otp"
            ? "Enter the verification code sent to your email."
            : "Update your password to keep your account secure."}
        </p>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-5">
        {step === "form" ? (
          <PasswordForm hasPassword={hasPassword} onOtpSent={handleOtpSent} />
        ) : (
          <OtpStep
            currentPassword={currentPassword}
            newPassword={newPassword}
            onSuccess={handleSuccess}
            onBack={() => setStep("form")}
          />
        )}
      </div>
    </div>
  );
}
