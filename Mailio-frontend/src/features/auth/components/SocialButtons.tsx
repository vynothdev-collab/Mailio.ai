"use client";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authService } from "@/src/services/authService";
import { useAuth } from "@/src/hooks/useAuth";
import { clearSession } from "@/src/utils/storage";
import {
  beginLinkedinAuth,
  getLinkedinConfig,
} from "@/src/features/auth/lib/linkedin";
import type { ApiError } from "@/src/types/auth";

const GoogleIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <g clipPath="url(#sb_g_clip)">
      <path d="M27.7268 14.3225C27.7268 13.3709 27.6496 12.414 27.485 11.4778H14.2798V16.8689H21.8418C21.528 18.6077 20.5197 20.1458 19.0433 21.1232V24.6213H23.5548C26.2041 22.1829 27.7268 18.582 27.7268 14.3225Z" fill="#4285F4"/>
      <path d="M14.2798 28.0009C18.0557 28.0009 21.2399 26.7611 23.56 24.6211L19.0485 21.1231C17.7933 21.977 16.1729 22.4606 14.2849 22.4606C10.6325 22.4606 7.53572 19.9965 6.42456 16.6836H1.76904V20.2897C4.14567 25.0172 8.98639 28.0009 14.2798 28.0009Z" fill="#34A853"/>
      <path d="M6.41941 16.6837C5.83297 14.9449 5.83297 13.0621 6.41941 11.3234V7.71729H1.76904C-0.216632 11.6732 -0.216632 16.3339 1.76904 20.2898L6.41941 16.6837Z" fill="#FBBC04"/>
      <path d="M14.2798 5.54127C16.2757 5.51041 18.2048 6.26146 19.6504 7.64012L23.6474 3.64305C21.1165 1.26642 17.7573 -0.0402103 14.2798 0.000943444C8.98638 0.000943444 4.14567 2.98459 1.76904 7.71728L6.41942 11.3234C7.52542 8.00536 10.6274 5.54127 14.2798 5.54127Z" fill="#EA4335"/>
    </g>
    <defs><clipPath id="sb_g_clip"><rect width="28" height="28" fill="white"/></clipPath></defs>
  </svg>
);

const LinkedinIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.95v5.66H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 11-.01-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/>
  </svg>
);

interface SocialAuthButtonsProps {
  remember?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
}

export function SocialAuthButtons({ remember = false, disabled = false, iconOnly = false }: SocialAuthButtonsProps) {
  const router = useRouter();
  const { refresh: refreshUser } = useAuth();
  const [pending, setPending] = useState(false);

  const handleGoogleCredential = async ({ credential }: CredentialResponse) => {
    if (!credential) {
      toast.error("Google did not return a credential.");
      return;
    }
    setPending(true);
    clearSession();
    try {
      const res = await authService.googleLogin({ idToken: credential, remember });
      await refreshUser();
      toast.success(`Welcome, ${res.user.name.split(" ")[0]}!`);
      router.push("/dashboard");
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Google sign-in failed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleLinkedinClick = () => {
    const config = getLinkedinConfig();
    if (!config) {
      toast.error("LinkedIn sign-in is not configured.");
      return;
    }
    clearSession();
    beginLinkedinAuth(config);
  };

  const isDisabled = disabled || pending;

  if (iconOnly) {
    return (
      <div className="flex items-center justify-center gap-5">
        <div className="relative">
          <button
            type="button"
            disabled={isDisabled}
            aria-label="Sign in with Google"
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted disabled:opacity-50"
          >
            <GoogleIcon size={26} />
          </button>
          <div
            className="absolute inset-0 opacity-0 [&>div]:!w-full [&_iframe]:!w-full"
            aria-hidden
          >
            <GoogleLogin
              onSuccess={handleGoogleCredential}
              onError={() => toast.error("Google sign-in was cancelled or failed.")}
              useOneTap={false}
              theme="outline"
              size="large"
              width="40"
              type="icon"
              shape="circle"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={isDisabled}
          onClick={handleLinkedinClick}
          aria-label="Sign in with LinkedIn"
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted disabled:opacity-50"
        >
          <LinkedinIcon size={26} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Button
          type="button"
          variant="outline"
          disabled={isDisabled}
          className="w-full gap-2 h-10 font-medium"
        >
          <GoogleIcon />
          {pending ? "Signing in…" : "Google"}
        </Button>
        <div
          className="absolute inset-0 opacity-0 [&>div]:!w-full [&_iframe]:!w-full"
          aria-hidden
        >
          <GoogleLogin
            onSuccess={handleGoogleCredential}
            onError={() => toast.error("Google sign-in was cancelled or failed.")}
            useOneTap={false}
            theme="outline"
            size="large"
            width="100%"
            text="continue_with"
            shape="rectangular"
            logo_alignment="left"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={isDisabled}
        onClick={handleLinkedinClick}
        className="flex-1 gap-2 h-10 font-medium"
      >
        <LinkedinIcon />
        LinkedIn
      </Button>
    </div>
  );
}
