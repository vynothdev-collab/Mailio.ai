"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/src/services/authService";
import { clearSession } from "@/src/utils/storage";
import { SocialAuthButtons } from "./SocialButtons";
import type { ApiError } from "@/src/types/auth";
import type { SignupFormData } from "../types";

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirm] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading">("idle");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({ defaultValues: { terms: true } });

  const passwordValue = watch("password", "");

  const onSubmit = async (data: SignupFormData) => {
    setSubmitState("loading");
    clearSession();
    try {
      await authService.signup({
        fullName: data.fullName,
        email: data.email,
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
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl">
          Create your account
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Join emailanswers.ai and take your productivity to the next level
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3.5 sm:space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="signup-name" className="text-xs font-medium text-foreground sm:text-sm">
            Full name
          </label>
          <Input
            id="signup-name"
            type="text"
            placeholder="full name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            className="h-10 rounded-lg bg-white text-sm sm:h-11"
            {...register("fullName", {
              required: "Full name is required.",
              minLength: { value: 2, message: "Name must be at least 2 characters." },
            })}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="text-xs font-medium text-foreground sm:text-sm">
            Email
          </label>
          <Input
            id="signup-email"
            type="email"
            placeholder="Example@email.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className="h-10 rounded-lg bg-white text-sm sm:h-11"
            {...register("email", {
              required: "Email is required.",
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." },
            })}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="text-xs font-medium text-foreground sm:text-sm">
            Password
          </label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              className="h-10 rounded-lg bg-white pr-10 text-sm sm:h-11"
              {...register("password", {
                required: "Password is required.",
                minLength: { value: 8, message: "Password must be at least 8 characters." },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-confirm" className="text-xs font-medium text-foreground sm:text-sm">
            Confirm Password
          </label>
          <div className="relative">
            <Input
              id="signup-confirm"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              className="h-10 rounded-lg bg-white pr-10 text-sm sm:h-11"
              {...register("confirmPassword", {
                required: "Please confirm your password.",
                validate: (val) => val === passwordValue || "Passwords do not match.",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={submitState === "loading"}
          className="h-11 w-full rounded-lg bg-[#162D3A] text-sm text-white hover:bg-[#0e1f29] sm:h-12 sm:text-base"
        >
          {submitState === "loading" ? (
            <><Loader2 size={16} className="animate-spin" /> Creating account…</>
          ) : (
            "Sign up"
          )}
        </Button>
      </form>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">Or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <SocialAuthButtons iconOnly />

      <p className="text-center text-xs text-muted-foreground sm:text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#2563eb] hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
