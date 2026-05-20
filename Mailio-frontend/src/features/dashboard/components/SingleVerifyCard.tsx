"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Mail, CheckCircle2, XCircle, AlertTriangle, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { verificationService } from "@/src/services/verificationService";
import type { ApiError } from "@/src/types/auth";
import type { VerificationResponse } from "@/src/types/verification";

interface FormData { email: string }

interface Props {
  onVerified?: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; Icon: React.ElementType; label: string }> = {
  valid:      { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700",       Icon: CheckCircle2,  label: "Valid"      },
  invalid:    { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",           Icon: XCircle,       label: "Invalid"    },
  risky:      { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",         Icon: AlertTriangle, label: "Risky"      },
  disposable: { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700",        Icon: AlertTriangle, label: "Disposable" },
  unknown:    { bg: "bg-muted",      border: "border-border",      text: "text-muted-foreground",  Icon: AlertTriangle, label: "Unknown"    },
};

function formatVerifiedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function LastVerificationPanel({
  result,
  onDismiss,
}: {
  result: VerificationResponse;
  onDismiss: () => void;
}) {
  const cfg = STATUS_STYLES[result.status] ?? STATUS_STYLES.unknown;
  return (
    <div
      className={cn(
        "mt-4 rounded-xl border p-3 space-y-2",
        cfg.bg, cfg.border,
      )}
      role="status"
    >
      <div className="flex items-start gap-2">
        <cfg.Icon size={16} className={cn("shrink-0 mt-0.5", cfg.text)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn("text-sm font-semibold truncate", cfg.text)}>{result.email}</p>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss result"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          </div>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
            <span className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              cfg.text, cfg.border,
            )}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{result.description}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Verified {formatVerifiedAt(result.verifiedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SingleVerifyCard({ onVerified }: Props) {
  const [verifying, setVerifying] = useState(false);
  const [result,    setResult]    = useState<VerificationResponse | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async ({ email }: FormData) => {
    setVerifying(true);
    setResult(null);
    try {
      const res = await verificationService.verifySingleEmail(email);
      setResult(res);
      onVerified?.();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="leading-tight">Single Email Verification</CardTitle>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#E6EEFB] px-2.5 py-1 text-[11px] font-semibold text-[#0F5BFF]">
            Instant
          </span>
        </div>
        <CardDescription className="mt-1">
          Verify one address against mailbox, domain, and disposable list checks.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="email"
              placeholder="name@company.com"
              aria-invalid={!!errors.email}
              className="pl-9 h-10"
              {...register("email", {
                required: "Email is required.",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address." },
              })}
            />
          </div>

          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={verifying}
            className="w-full rounded-full border-0 bg-[#7EA6FF] text-white hover:bg-[#6C97FB] h-11"
          >
            {verifying ? (
              <><Loader2 size={15} className="animate-spin" /> Verifying…</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M12.8334 1.16675L8.75002 12.8334L6.41669 7.58341L1.16669 5.25008L12.8334 1.16675Z" stroke="white" strokeWidth="1.28333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12.8334 1.16675L6.41669 7.58341" stroke="white" strokeWidth="1.28333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Verify Now
              </>
            )}
          </Button>
        </form>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          We check syntax, domain, mailbox &amp; catch-all in &lt; 1.5s
        </p>

        {result && (
          <LastVerificationPanel result={result} onDismiss={() => setResult(null)} />
        )}
      </CardContent>
    </Card>
  );
}
