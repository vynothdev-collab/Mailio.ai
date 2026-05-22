"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/src/services/authService";
import { useAuth } from "@/src/hooks/useAuth";
import { clearSession } from "@/src/utils/storage";
import { SocialAuthButtons } from "./SocialButtons";
import type { ApiError } from "@/src/types/auth";
import type { LoginFormData } from "../types";

export function LoginForm() {
  const router = useRouter();
  const { refresh: refreshUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "error">("idle");
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
        email: data.email,
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
    <div className="space-y-5 sm:space-y-7">
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome
          <Sparkles className="h-5 w-5 text-[#18D6B3] sm:h-7 sm:w-7" />
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Today is a new day. It&apos;s your day. You shape it. Sign in to
          start managing your projects.
        </p>
      </div>

      {submitState === "error" && errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 sm:space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-xs font-medium text-foreground sm:text-sm">
            Email
          </label>
          <Input
            id="login-email"
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
          <label htmlFor="login-password" className="text-xs font-medium text-foreground sm:text-sm">
            Password
          </label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="current-password"
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
          <div className="flex justify-end pt-1">
            <Link href="/forgot-password" className="text-xs font-medium text-[#2563eb] hover:underline sm:text-sm">
              Forgot Password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitState === "loading"}
          className="h-11 w-full rounded-lg bg-[#162D3A] text-sm text-white hover:bg-[#0e1f29] sm:h-12 sm:text-base"
        >
          {submitState === "loading" ? (
            <><Loader2 size={16} className="animate-spin" /> Signing in…</>
          ) : (
            "Sign in"
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
        Don&apos;t you have an account?{" "}
        <Link href="/signup" className="font-semibold text-[#2563eb] hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
