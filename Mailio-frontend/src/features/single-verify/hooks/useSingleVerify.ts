"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { verificationService } from "@/src/services/verificationService";
import type {
  ApiCheckStatus,
  VerificationCheck,
  VerificationResponse,
} from "@/src/types/verification";
import type { ApiError } from "@/src/types/auth";
import { useVerificationHistory } from "@/src/context/VerificationContext";
import type {
  CheckItem,
  CheckStatus,
  EmailStatus,
  VerificationResult,
} from "../types";

type VerifyState = "idle" | "loading" | "done" | "error";

interface UseSingleVerifyResult {
  state:    VerifyState;
  result:   VerificationResult | null;
  verify:   (email: string) => Promise<void>;
  reset:    () => void;
}

const ALLOWED_EMAIL_STATUSES: readonly EmailStatus[] = [
  "valid", "invalid", "catchall", "disposable", "unknown",
];

function mapEmailStatus(raw: string): EmailStatus {
  const normalized = raw?.toLowerCase() as EmailStatus;
  return ALLOWED_EMAIL_STATUSES.includes(normalized) ? normalized : "unknown";
}

function mapCheckStatus(raw: ApiCheckStatus): CheckStatus {
  return raw;
}

function mapCheck(check: VerificationCheck): CheckItem {
  return {
    key:    check.key,
    label:  check.label,
    value:  check.value,
    status: mapCheckStatus(check.status),
  };
}

function formatConfidence(score: number): string {
  if (Number.isNaN(score)) return "—";
  return `${Math.round(score)}%`;
}

function mapResponse(res: VerificationResponse): VerificationResult {
  return {
    id:          res.id,
    email:       res.email,
    status:      mapEmailStatus(res.status),
    confidence:  formatConfidence(res.confidence),
    description: res.description,
    verifiedAt:  res.verifiedAt,
    durationMs:  res.durationMs,
    checks:      res.checks.map(mapCheck),
  };
}

export function useSingleVerify(): UseSingleVerifyResult {
  const [state,  setState]  = useState<VerifyState>("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const { push } = useVerificationHistory();

  const verify = useCallback(async (email: string) => {
    setState("loading");
    setResult(null);
    try {
      const apiResult = await verificationService.verifySingleEmail(email);
      const mapped    = mapResponse(apiResult);
      setResult(mapped);
      push(mapped);
      setState("done");
      toast.success(`${email} verified.`);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Verification failed. Please try again.");
      setState("error");
    }
  }, [push]);

  const reset = useCallback(() => {
    setState("idle");
    setResult(null);
  }, []);

  return { state, result, verify, reset };
}
