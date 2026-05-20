"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/src/services/authService";
import { useAuth } from "@/src/hooks/useAuth";
import { clearSession } from "@/src/utils/storage";
import {
  consumeLinkedinState,
  getLinkedinConfig,
} from "@/src/features/auth/lib/linkedin";
import type { ApiError } from "@/src/types/auth";

function LinkedinCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh: refreshUser } = useAuth();
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const providerError = params.get("error");
    const providerErrorDescription = params.get("error_description");

    if (providerError) {
      setError(
        providerErrorDescription ||
          "LinkedIn sign-in was cancelled or denied.",
      );
      return;
    }
    if (!code) {
      setError("LinkedIn did not return an authorization code.");
      return;
    }
    if (!consumeLinkedinState(state)) {
      setError("LinkedIn state mismatch — possible CSRF. Please try again.");
      return;
    }

    const config = getLinkedinConfig();
    if (!config) {
      setError("LinkedIn is not configured for this environment.");
      return;
    }

    clearSession();
    (async () => {
      try {
        const res = await authService.linkedinLogin({
          code,
          redirectUri: config.redirectUri,
        });
        await refreshUser();
        toast.success(`Welcome, ${res.user.name.split(" ")[0]}!`);
        router.replace("/dashboard");
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr?.message ?? "LinkedIn sign-in failed. Please try again.");
      }
    })();
  }, [params, refreshUser, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle size={20} />
          </div>
          <h1 className="text-lg font-semibold">LinkedIn sign-in failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link
            href="/login"
            className="inline-block w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        Completing LinkedIn sign-in…
      </div>
    </div>
  );
}

function LinkedinCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        Completing LinkedIn sign-in…
      </div>
    </div>
  );
}

export default function LinkedinCallbackPage() {
  return (
    <Suspense fallback={<LinkedinCallbackFallback />}>
      <LinkedinCallbackInner />
    </Suspense>
  );
}
