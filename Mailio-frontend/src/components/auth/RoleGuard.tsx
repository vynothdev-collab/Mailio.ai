"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";
import type { UserRole } from "@/src/types/user";

interface RoleGuardProps {
  allow: UserRole[];

  redirectTo?: string;

  fallback?: ReactNode;

  deniedRender?: ReactNode;
  children: ReactNode;
}

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
    if (!user) return;
    if (allowed) return;
    if (deniedRender !== undefined) return;
    router.replace(redirectTo);
  }, [isInitialized, user, allowed, deniedRender, redirectTo, router]);

  if (!isInitialized) return <>{fallback}</>;
  if (!user) return <>{fallback}</>;
  if (!allowed) return <>{deniedRender ?? fallback}</>;
  return <>{children}</>;
}
