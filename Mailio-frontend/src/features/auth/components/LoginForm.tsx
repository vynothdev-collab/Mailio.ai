"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";
import { authService } from "@/src/services/authService";
import { useAuth } from "@/src/hooks/useAuth";
import { clearSession } from "@/src/utils/storage";
import { SocialAuthButtons } from "./SocialButtons";
import type { ApiError } from "@/src/types/auth";
import type { LoginFormData } from "../types";

export function LoginForm() {
  const router    = useRouter();
  const { refresh: refreshUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitState, setSubmitState]   = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ defaultValues: { remember: false } });

  const onSubmit = async (data: LoginFormData) => {
    setSubmitState("loading");
    setErrorMessage("");
    clearSession();
    try {
      const res = await authService.login({
        email:    data.email,
        password: data.password,
        remember: data.remember,
      });

      await refreshUser();

      toast.success(`Welcome back, ${res.user.name.split(" ")[0]}!`);
      router.push("/dashboard");
    } catch (err) {
      const apiErr = err as ApiError;
      const unverified =
        apiErr?.status === 401 &&
        typeof apiErr.message === "string" &&
        apiErr.message.toLowerCase().includes("verify your email");

      if (unverified) {
        toast.error(apiErr.message);
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        return;
      }

      const msg =
        apiErr?.status === 401
          ? "Invalid email or password. Please try again."
          : apiErr?.message ?? "Sign in failed. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
      setSubmitState("error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to your Mailio.ai account
        </p>
      </div>

      {submitState === "error" && errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-sm font-medium">
            Email address
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="login-email"
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
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className="pl-9 pr-10 h-10"
              {...register("password", {
                required: "Password is required.",
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
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-border accent-primary cursor-pointer"
            )}
            {...register("remember")}
          />
          <span className="text-sm text-muted-foreground">Remember me for 30 days</span>
        </label>

        <Button
          type="submit"
          size="lg"
          disabled={submitState === "loading"}
          className="w-full gradient-brand border-0 text-white hover:opacity-90 h-10"
        >
          {submitState === "loading" ? (
            <><Loader2 size={15} className="animate-spin" /> Signing in…</>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">or continue with</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <SocialAuthButtons />


      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create one free
        </Link>
      </p>
    </div>
  );
}
