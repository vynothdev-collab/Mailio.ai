"use client";

import { useAuth } from "./useAuth";
import { useRole } from "./useRole";

/**
 * Convenience hook combining the auth user with the role flags. Use this in
 * components that need both the profile and role-derived booleans without
 * reaching into AuthContext directly.
 */
export function useCurrentUser() {
  const { user, loading, isInitialized, isAuthenticated, refresh, logout } = useAuth();
  const { user: _roleUser, ...roleFlags } = useRole();
  return { user, loading, isInitialized, isAuthenticated, refresh, logout, ...roleFlags };
}
