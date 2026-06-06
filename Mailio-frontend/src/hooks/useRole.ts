"use client";

import { useAuth } from "./useAuth";
import type { UserProfile, UserRole } from "@/src/types/user";

export interface RoleFlags {
  user: UserProfile | null;
  role: UserRole | null;
  isNormalUser: boolean;
  isEnterpriseUser: boolean;
  isEnterpriseAdmin: boolean;
  isSuperAdmin: boolean;

  isEnterpriseMember: boolean;

  canAccessBilling: boolean;

  canManageUsers: boolean;

  canManageEnterprise: boolean;
}

export function roleFlagsFor(user: UserProfile | null): RoleFlags {
  const role = user?.role ?? null;
  const isNormalUser = role === "USER";
  const isEnterpriseUser = role === "ENTERPRISE_USER";
  const isEnterpriseAdmin = role === "ENTERPRISE_ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";
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
