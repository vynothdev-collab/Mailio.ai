"use client";

import { useForm } from "react-hook-form";
import { Mail, X, Loader2 } from "lucide-react";
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

            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 shrink-0 gap-1.5 rounded-full border-0 bg-[#0F5BFF] px-6 text-white hover:bg-[#0A4BD9] disabled:bg-[#7EA6FF] disabled:opacity-100"
            >
              {isLoading ? (
                <><Loader2 size={14} className="animate-spin" /> Verifying…</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M12.8334 1.16675L8.75008 12.8334L6.41675 7.58341L1.16675 5.25008L12.8334 1.16675Z" stroke="white" strokeWidth="1.28333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.8334 1.16675L6.41675 7.58341" stroke="white" strokeWidth="1.28333" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Verify Now
                </>
              )}
            </Button>
          </div>

          {errors.email && (
            <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
          )}
        </form>

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
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M9 5.5H3C2.44772 5.5 2 5.94772 2 6.5V9.5C2 10.0523 2.44772 10.5 3 10.5H9C9.55228 10.5 10 10.0523 10 9.5V6.5C10 5.94772 9.55228 5.5 9 5.5Z" stroke="#8B847A" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 5.5V4C4 3.46957 4.21071 2.96086 4.58579 2.58579C4.96086 2.21071 5.46957 2 6 2C6.53043 2 7.03914 2.21071 7.41421 2.58579C7.78929 2.96086 8 3.46957 8 4V5.5" stroke="#8B847A" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Your data is secure and never shared.
        </span>
      </CardContent>
    </Card>
  );
}
