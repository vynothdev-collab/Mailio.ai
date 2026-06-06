"use client";

import { useAuth } from "./useAuth";
import { useRole } from "./useRole";

export function useCurrentUser() {
  const { user, loading, isInitialized, isAuthenticated, refresh, logout } = useAuth();
  const { user: _roleUser, ...roleFlags } = useRole();
  return { user, loading, isInitialized, isAuthenticated, refresh, logout, ...roleFlags };
}
