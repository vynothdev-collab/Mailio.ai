"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";
import { authService } from "@/src/services/authService";
import { clearSession } from "@/src/utils/storage";
import { SocialAuthButtons } from "./SocialButtons";
import type { ApiError } from "@/src/types/auth";
import type { SignupFormData } from "../types";

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: "8+ characters",        pass: password.length >= 8             },
    { label: "Uppercase letter",      pass: /[A-Z]/.test(password)           },
    { label: "Number or symbol",      pass: /[0-9!@#$%^&*]/.test(password)  },
  ];

  const score = checks.filter((c) => c.pass).length;
  const colors = ["bg-destructive", "bg-amber-400", "bg-amber-400", "bg-emerald-500"];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < score ? colors[score] : "bg-muted"
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map(({ label, pass }) => (
          <span
            key={label}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              pass ? "text-emerald-600" : "text-muted-foreground"
            )}
          >
            <CheckCircle2 size={10} className={pass ? "text-emerald-500" : "text-muted-foreground/40"} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirm]  = useState(false);
  const [submitState, setSubmitState]          = useState<"idle" | "loading">("idle");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({ defaultValues: { terms: false } });

  const passwordValue = watch("password", "");

  const onSubmit = async (data: SignupFormData) => {
    setSubmitState("loading");
    clearSession();
    try {
      await authService.signup({
        fullName: data.fullName,
        email:    data.email,
        password: data.password,
      });

      toast.success("Account created. Check your inbox for the verification code.");
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Signup failed. Please try again.");
      setSubmitState("idle");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground">
          Start verifying emails for free — no credit card required
        </p>
      </div>

      <SocialAuthButtons />

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">or sign up with email</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="signup-name" className="text-sm font-medium">Full name</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="signup-name"
              type="text"
              placeholder="Jane Smith"
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              className="pl-9 h-10"
              {...register("fullName", {
                required:  "Full name is required.",
                minLength: { value: 2, message: "Name must be at least 2 characters." },
              })}
            />
          </div>
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="text-sm font-medium">Work email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="signup-email"
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
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="text-sm font-medium">Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              className="pl-9 pr-10 h-10"
              {...register("password", {
                required:  "Password is required.",
                minLength: { value: 8, message: "Password must be at least 8 characters." },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password
            ? <p className="text-xs text-destructive">{errors.password.message}</p>
            : <PasswordStrength password={passwordValue} />
          }
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-confirm" className="text-sm font-medium">Confirm password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="signup-confirm"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repeat your password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              className="pl-9 pr-10 h-10"
              {...register("confirmPassword", {
                required: "Please confirm your password.",
                validate: (val) => val === passwordValue || "Passwords do not match.",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer"
              {...register("terms", { required: "You must accept the terms to continue." })}
            />
            <span className="text-sm text-muted-foreground leading-snug">
              I agree to the{" "}
              <a href="#" className="font-medium text-foreground hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="font-medium text-foreground hover:underline">Privacy Policy</a>
            </span>
          </label>
          {errors.terms && (
            <p className="text-xs text-destructive">{errors.terms.message}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={submitState === "loading"}
          className="w-full gradient-brand border-0 text-white hover:opacity-90 h-10"
        >
          {submitState === "loading" ? (
            <><Loader2 size={15} className="animate-spin" /> Creating account…</>
          ) : (
            "Create free account"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
