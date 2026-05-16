"use client";

import { useForm } from "react-hook-form";
import { Mail, X, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { PERFORMED_CHECKS } from "../constants";

interface FormData { email: string }

interface EmailInputCardProps {
  onVerify:  (email: string) => void;
  isLoading: boolean;
}

export function EmailInputCard({ onVerify, isLoading }: EmailInputCardProps) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>();
  const emailValue = watch("email", "");

  const onSubmit = ({ email }: FormData) => onVerify(email);

  return (
    <Card>
      <CardContent className="pt-2 space-y-3">
        <h2 className="text-sm font-semibold">Enter Email Address</h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex gap-2">
            {/* Input */}
            <div className="relative flex-1">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="email"
                placeholder="name@company.com"
                aria-invalid={!!errors.email}
                className={cn(
                  "pl-9 pr-9 h-10",
                  errors.email && "border-destructive focus-visible:ring-destructive/20"
                )}
                {...register("email", {
                  required: "Email is required.",
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." },
                })}
              />
              {emailValue && (
                <button
                  type="button"
                  onClick={() => reset()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear input"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* CTA */}
            <Button
              type="submit"
              disabled={isLoading}
              className="gradient-accent border-0 text-white hover:opacity-90 h-10 gap-1.5 shrink-0"
            >
              {isLoading ? (
                <><Loader2 size={14} className="animate-spin" /> Verifying…</>
              ) : (
                <><Mail size={14} /> Verify Now</>
              )}
            </Button>
          </div>

          {errors.email && (
            <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
          )}
        </form>

        {/* Footer row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>Checks performed:</span>
            {PERFORMED_CHECKS.map((check) => (
              <span
                key={check}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
              >
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                {check}
              </span>
            ))}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck size={11} />
            Your data is secure and never shared.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
