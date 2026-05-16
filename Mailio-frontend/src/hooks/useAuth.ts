"use client";

// React hook for accessing the auth context.
// Throws if used outside <AuthProvider> so misuse fails loudly in dev.

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/src/context/AuthContext";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

/**
 * Convenience hook for protected pages.
 * Redirects to /login once we know the user is unauthenticated.
 * Returns the same value as `useAuth()`.
 */
export function useRequireAuth() {
  const auth   = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      router.replace("/login");
    }
  }, [auth.loading, auth.isAuthenticated, router]);

  return auth;
}
