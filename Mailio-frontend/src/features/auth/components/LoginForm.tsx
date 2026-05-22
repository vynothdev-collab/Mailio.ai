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
          <svg className="h-5 w-5 sm:h-7 sm:w-7 text-[#F9C023]" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#wicon)">
              <path d="M506.859 242.117C506.869 239.157 506.291 236.224 505.159 233.488C504.027 230.753 502.363 228.27 500.264 226.182C491.528 217.448 477.28 217.412 468.5 226.1C463.696 230.758 381.666 312.546 374.488 319.683C367.465 326.676 356.099 326.656 349.103 319.635C342.106 312.613 342.128 301.248 349.151 294.25C392.545 250.991 461.797 182.019 505.223 138.765C509.5 134.509 511.855 128.85 511.862 122.825C511.874 119.862 511.297 116.926 510.165 114.188C509.032 111.449 507.367 108.963 505.266 106.874L504.646 106.254C495.887 97.4962 481.618 97.4802 472.837 106.217C444.437 134.463 361.985 216.596 332.627 245.84C325.605 252.835 314.242 252.814 307.246 245.792C300.25 238.771 300.268 227.407 307.288 220.41C352.118 175.687 413.729 114.411 458.408 69.8855C462.68 65.6325 465.035 59.9735 465.042 53.9496C465.049 47.9256 462.706 42.2607 458.447 38.0017L457.685 37.2397C453.431 32.9867 447.776 30.6438 441.762 30.6438C435.747 30.6438 430.093 32.9857 425.84 37.2397L275.084 187.993C268.075 195.001 256.709 195.001 249.699 187.993C242.689 180.984 242.689 169.618 249.699 162.608L373.387 38.9207C377.64 34.6667 379.982 29.0118 379.982 22.9968C379.982 16.9819 377.64 11.3279 373.387 7.07495L372.884 6.57096C364.119 -2.19197 349.832 -2.19497 341.052 6.58696L139.769 207.872C137.001 210.64 133.405 212.427 129.527 212.961C125.65 213.496 121.704 212.748 118.291 210.832C114.878 208.916 112.184 205.937 110.621 202.349C109.058 198.761 108.71 194.76 109.631 190.956L144.058 48.7886C147.414 34.9317 139.842 20.8018 126.445 15.9209C123.36 14.7873 120.1 14.2038 116.813 14.1969C112.231 14.1969 107.69 15.3499 103.494 17.6349C96.3432 21.5278 91.4072 28.0428 89.5962 35.9797L86.9373 47.6296C73.5284 106.371 51.4225 165.284 21.2328 222.73C3.18492 257.07 -3.68603 297.252 1.88593 335.871C7.64389 375.786 25.8087 412.006 54.4155 440.613C89.5272 475.724 136.202 495.057 185.852 495.057H185.978C235.676 495.024 282.375 475.626 317.47 440.438L362.203 395.585L500.256 258.036C504.508 253.794 506.856 248.136 506.859 242.117ZM463.265 390.151C466.525 382.536 462.994 373.718 455.379 370.459C447.763 367.197 438.947 370.729 435.687 378.345C430.655 390.099 423.473 400.69 414.341 409.822C403.184 420.978 390.001 429.145 375.157 434.096C367.298 436.717 363.052 445.212 365.673 453.071C367.769 459.355 373.621 463.329 379.901 463.329C381.474 463.329 383.074 463.08 384.649 462.555C403.949 456.117 421.077 445.513 435.555 431.035C447.398 419.188 456.722 405.433 463.265 390.151ZM502.906 398.425C495.291 395.161 486.473 398.686 483.209 406.301C476.2 422.65 466.206 437.38 453.505 450.08C438.734 464.852 421.358 475.887 401.862 482.876C394.064 485.672 390.008 494.26 392.804 502.059C395 508.185 400.771 512 406.925 512C408.605 512 410.314 511.716 411.987 511.116C435.685 502.62 456.79 489.221 474.718 471.293C490.13 455.882 502.263 437.993 510.782 418.121C514.047 410.507 510.52 401.688 502.906 398.425Z" fill="currentColor"/>
            </g>
            <defs><clipPath id="wicon"><rect width="512" height="512" fill="white"/></clipPath></defs>
          </svg>
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Sign in to continue managing your email verification, bulk uploads, and real-time validation reports with confidence.
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
