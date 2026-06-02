"use client";

import { useState } from "react";
import { authService } from "@/services/auth.service";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  onSuccess: (email: string) => void;
}

interface FormErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email.";
  }
  if (!password) {
    errors.password = "Password is required.";
  }
  return errors;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setServerError("");
    setLoading(true);
    try {
      await authService.login({ email: email.trim(), password });
      onSuccess(email.trim());
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white px-8 py-10 shadow-sm border border-gray-100">
      {/* Shield icon */}
      <div className="mb-6 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
          <svg className="h-7 w-7 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>

      {/* Heading */}
      <div className="mb-7 space-y-1 text-center">
        <h2 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
          Welcome back, Admin
          <svg className="h-6 w-6 text-[#F9C023]" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#waving)">
              <path d="M506.859 242.117C506.869 239.157 506.291 236.224 505.159 233.488C504.027 230.753 502.363 228.27 500.264 226.182C491.528 217.448 477.28 217.412 468.5 226.1C463.696 230.758 381.666 312.546 374.488 319.683C367.465 326.676 356.099 326.656 349.103 319.635C342.106 312.613 342.128 301.248 349.151 294.25C392.545 250.991 461.797 182.019 505.223 138.765C509.5 134.509 511.855 128.85 511.862 122.825C511.874 119.862 511.297 116.926 510.165 114.188C509.032 111.449 507.367 108.963 505.266 106.874L504.646 106.254C495.887 97.4962 481.618 97.4802 472.837 106.217C444.437 134.463 361.985 216.596 332.627 245.84C325.605 252.835 314.242 252.814 307.246 245.792C300.25 238.771 300.268 227.407 307.288 220.41C352.118 175.687 413.729 114.411 458.408 69.8855C462.68 65.6325 465.035 59.9735 465.042 53.9496C465.049 47.9256 462.706 42.2607 458.447 38.0017L457.685 37.2397C453.431 32.9867 447.776 30.6438 441.762 30.6438C435.747 30.6438 430.093 32.9857 425.84 37.2397L275.084 187.993C268.075 195.001 256.709 195.001 249.699 187.993C242.689 180.984 242.689 169.618 249.699 162.608L373.387 38.9207C377.64 34.6667 379.982 29.0118 379.982 22.9968C379.982 16.9819 377.64 11.3279 373.387 7.07495L372.884 6.57096C364.119-2.19197 349.832-2.19497 341.052 6.58696L139.769 207.872C137.001 210.64 133.405 212.427 129.527 212.961C125.65 213.496 121.704 212.748 118.291 210.832C114.878 208.916 112.184 205.937 110.621 202.349C109.058 198.761 108.71 194.76 109.631 190.956L144.058 48.7886C147.414 34.9317 139.842 20.8018 126.445 15.9209C123.36 14.7873 120.1 14.2038 116.813 14.1969C112.231 14.1969 107.69 15.3499 103.494 17.6349C96.3432 21.5278 91.4072 28.0428 89.5962 35.9797L86.9373 47.6296C73.5284 106.371 51.4225 165.284 21.2328 222.73C3.18492 257.07-3.68603 297.252 1.88593 335.871C7.64389 375.786 25.8087 412.006 54.4155 440.613C89.5272 475.724 136.202 495.057 185.852 495.057H185.978C235.676 495.024 282.375 475.626 317.47 440.438L362.203 395.585L500.256 258.036C504.508 253.794 506.856 248.136 506.859 242.117Z" fill="currentColor" />
            </g>
            <defs>
              <clipPath id="waving"><rect width="512" height="512" fill="white" /></clipPath>
            </defs>
          </svg>
        </h2>
        <p className="text-sm text-gray-500">
          Sign in to continue to your admin control panel
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <input
              id="login-email"
              type="email"
              placeholder="admin@emailanswers.ai"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              disabled={loading}
              className={cn(
                "w-full h-11 rounded-lg border bg-white pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400",
                "focus:outline-none focus:ring-2 focus:border-[#2563EB] focus:ring-[#2563EB]/20",
                "disabled:cursor-not-allowed disabled:opacity-60 transition-colors",
                errors.email ? "border-red-400 focus:ring-red-400/20 focus:border-red-400" : "border-gray-200"
              )}
            />
          </div>
          {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              disabled={loading}
              className={cn(
                "w-full h-11 rounded-lg border bg-white pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400",
                "focus:outline-none focus:ring-2 focus:border-[#2563EB] focus:ring-[#2563EB]/20",
                "disabled:cursor-not-allowed disabled:opacity-60 transition-colors",
                errors.password ? "border-red-400 focus:ring-red-400/20 focus:border-red-400" : "border-gray-200"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]/30 cursor-pointer"
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <span className="text-sm font-medium text-[#2563EB] cursor-not-allowed select-none">
            Forgot password?
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-[#2563EB] text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Signing in…
            </>
          ) : (
            <>
              Sign in to Dashboard
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* SSO button */}
      <button
        type="button"
        className="h-11 w-full rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Use Single Sign-On (SSO)
      </button>

      {/* Secure connection badge */}
      <div className="mt-5 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-medium text-emerald-600">Secure connection</span>
        </div>
        <p className="text-xs text-gray-400">Your data is protected with enterprise-grade security.</p>
      </div>
    </div>
  );
}
