"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";
import type { UserRole } from "@/src/types/user";

interface RoleGuardProps {
  /** Roles that ARE allowed to view the wrapped content. */
  allow: UserRole[];
  /** Where to redirect on deny. Defaults to /dashboard. */
  redirectTo?: string;
  /** What to render while we don't know the role yet. */
  fallback?: ReactNode;
  /** Optional render when the user is denied — overrides the redirect. */
  deniedRender?: ReactNode;
  children: ReactNode;
}

/**
 * Client-side route gate. Renders children only if the current user's role
 * is in `allow`. If the user is authenticated but the wrong role, redirects
 * to `redirectTo` (or shows `deniedRender` if provided). If not authenticated
 * yet, lets AuthProvider/api interceptor handle the login redirect.
 *
 * Security note: this is a UX gate. The backend still enforces RBAC on every
 * endpoint via JwtAuthGuard + RolesGuard.
 */
export function RoleGuard({
  allow,
  redirectTo = "/dashboard",
  fallback = null,
  deniedRender,
  children,
}: RoleGuardProps) {
  const router = useRouter();
  const { user, isInitialized, role } = useCurrentUser();

  const allowed = !!role && allow.includes(role);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) return; // api interceptor handles unauth
    if (allowed) return;
    if (deniedRender !== undefined) return; // explicit render path
    router.replace(redirectTo);
  }, [isInitialized, user, allowed, deniedRender, redirectTo, router]);

  if (!isInitialized) return <>{fallback}</>;
  if (!user) return <>{fallback}</>;
  if (!allowed) return <>{deniedRender ?? fallback}</>;
  return <>{children}</>;
}
