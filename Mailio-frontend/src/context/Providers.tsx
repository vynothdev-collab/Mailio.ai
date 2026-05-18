"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import type { ReactNode } from "react";
import { AuthProvider } from "@/src/context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

if (!GOOGLE_CLIENT_ID && typeof window !== "undefined") {
  console.warn("[auth] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured — Google login will be disabled.");
}

export function Providers({ children }: { children: ReactNode }) {
  if (!GOOGLE_CLIENT_ID) {
    return <AuthProvider>{children}</AuthProvider>;
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
}
