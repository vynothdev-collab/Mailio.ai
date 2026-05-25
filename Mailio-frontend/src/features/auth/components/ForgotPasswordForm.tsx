"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/src/services/authService";
import type { ApiError } from "@/src/types/auth";

interface FormData {
  email: string;
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authService.forgotPassword({ email: data.email });
      router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-7">
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl">
          Forgot your password?
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Enter your email and we&apos;ll send you a 6-digit reset code.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 sm:space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="fp-email" className="text-xs font-medium text-foreground sm:text-sm">
            Email
          </label>
          <Input
            id="fp-email"
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

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-[#162D3A] text-sm text-white hover:bg-[#0e1f29] disabled:opacity-60 sm:h-12 sm:text-base"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Sending…</>
          ) : (
            "Send reset code"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground sm:text-sm">
        Remember your password?{" "}
        <Link href="/login" className="font-semibold text-[#2563eb] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
