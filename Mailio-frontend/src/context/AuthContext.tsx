"use client";


import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/src/services/authService";
import { userService } from "@/src/services/userService";
import type { ApiError } from "@/src/types/auth";
import type { UserProfile } from "@/src/types/user";
import { STORAGE_KEYS, getItem } from "@/src/utils/storage";

interface AuthContextValue {
  user:             UserProfile | null;
  /** True while a /users/me request is in flight. */
  loading:          boolean;
  /** True once the initial bootstrap has resolved (success or failure). */
  isInitialized:    boolean;
  error:            string | null;
  isAuthenticated:  boolean;
  /** Force a re-fetch of /users/me — call after login, profile update, etc. */
  refresh:          () => Promise<UserProfile | null>;
  /** Calls /auth/logout, clears state + storage, redirects to /login. */
  logout:           () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user,          setUser]          = useState<UserProfile | null>(null);
  const [loading,       setLoading]       = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error,         setError]         = useState<string | null>(null);

  // Strict-mode-safe init guard — survives the second effect invocation that
  // React 19 fires in development.
  const bootstrappedRef = useRef(false);
  // Coalesces concurrent refresh() callers onto a single in-flight request.
  const inFlightRef     = useRef<Promise<UserProfile | null> | null>(null);

  /** Load /users/me. Returns null when there's no token to use. */
  const refresh = useCallback(async (): Promise<UserProfile | null> => {
    // Reuse any in-flight request so two callers can't trigger two API hits.
    if (inFlightRef.current) return inFlightRef.current;

    if (!getItem(STORAGE_KEYS.accessToken)) {
      setUser(null);
      setLoading(false);
      setIsInitialized(true);
      return null;
    }

    setLoading(true);
    setError(null);

    const request = (async () => {
      try {
        const profile = await userService.getCurrentUser();
        setUser(profile);
        return profile;
      } catch (err) {
        // 401 → api.ts already triggers refresh-or-redirect; we just mirror
        // the error message in context for any UI that wants to surface it.
        const apiErr = err as ApiError;
        setError(apiErr?.message ?? "Failed to load user profile.");
        setUser(null);
        return null;
      } finally {
        setLoading(false);
        setIsInitialized(true);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = request;
    return request;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  // Bootstrap exactly once per page load. The ref guard short-circuits the
  // second effect invocation that React Strict Mode fires in development.
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isInitialized,
      error,
      isAuthenticated: !!user,
      refresh,
      logout,
    }),
    [user, loading, isInitialized, error, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
