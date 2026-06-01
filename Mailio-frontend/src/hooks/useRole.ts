"use client";

import { useAuth } from "./useAuth";
import type { UserProfile, UserRole } from "@/src/types/user";

/**
 * Role helpers. Always prefer these over hand-rolled `user.role === '...'`
 * comparisons — that way, if we ever rename a role or add a new one, there's
 * a single place to fix it.
 */
export interface RoleFlags {
  user:                UserProfile | null;
  role:                UserRole | null;
  isNormalUser:        boolean;
  isEnterpriseUser:    boolean;
  isEnterpriseAdmin:   boolean;
  isSuperAdmin:        boolean;
  /** ENTERPRISE_USER or ENTERPRISE_ADMIN — anyone billing against the
   *  shared enterprise balance. */
  isEnterpriseMember:  boolean;
  /** Whether the Billing tab/route should be available to this user. */
  canAccessBilling:    boolean;
  /** Whether the user can manage other users (admin panel surface). */
  canManageUsers:      boolean;
  /** Whether the user can create/manage other users in their own enterprise. */
  canManageEnterprise: boolean;
}

export function roleFlagsFor(user: UserProfile | null): RoleFlags {
  const role = user?.role ?? null;
  const isNormalUser      = role === "USER";
  const isEnterpriseUser  = role === "ENTERPRISE_USER";
  const isEnterpriseAdmin = role === "ENTERPRISE_ADMIN";
  const isSuperAdmin      = role === "SUPER_ADMIN";
  const isEnterpriseMember = isEnterpriseUser || isEnterpriseAdmin;

  return {
    user,
    role,
    isNormalUser,
    isEnterpriseUser,
    isEnterpriseAdmin,
    isSuperAdmin,
    isEnterpriseMember,
    canAccessBilling: isNormalUser || isSuperAdmin || isEnterpriseAdmin,
    canManageUsers: isSuperAdmin,
    canManageEnterprise: isEnterpriseAdmin,
  };
}

export function useRole(): RoleFlags {
  const { user } = useAuth();
  return roleFlagsFor(user);
}
