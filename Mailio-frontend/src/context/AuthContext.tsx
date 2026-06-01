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
import {
  clearSession,
  getItem,
  STORAGE_KEYS,
  loadUserProfile,
  saveUserProfile,
} from "@/src/utils/storage";

interface AuthContextValue {
  user:            UserProfile | null;
  loading:         boolean;
  isInitialized:   boolean;
  error:           string | null;
  isAuthenticated: boolean;
  refresh:         () => Promise<UserProfile | null>;
  logout:          () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  // Seed from sessionStorage so the UI is never blank on first paint.
  const [user,          setUser]          = useState<UserProfile | null>(() =>
    typeof window !== "undefined" ? loadUserProfile() : null,
  );
  const [loading,       setLoading]       = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error,         setError]         = useState<string | null>(null);

  const bootstrappedRef = useRef(false);
  const inFlightRef     = useRef<Promise<UserProfile | null> | null>(null);

  const refresh = useCallback(async (): Promise<UserProfile | null> => {
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
        saveUserProfile(profile);
        return profile;
      } catch (err) {
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
      clearSession();
      setUser(null);
      setError(null);
      router.push("/login");
    }
  }, [router]);

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
