// Auth service — thin wrapper around the API for auth endpoints.
// Keeps components free of axios/url details and centralizes token persistence.

import { api } from "./api";
import {
  STORAGE_KEYS,
  type Persistence,
  clearSession,
  getCurrentPersistence,
  getItem,
  setItem,
} from "@/src/utils/storage";
import type {
  AuthResponse,
  AuthUser,
  LoginPayload,
  RefreshPayload,
  RefreshResponse,
  SignupPayload,
} from "@/src/types/auth";

/**
 * Persist auth state to the chosen browser store.
 * Login uses `remember` to decide; signup defaults to durable localStorage.
 */
function persistSession(data: AuthResponse, persistence: Persistence): void {
  setItem(STORAGE_KEYS.accessToken,  data.accessToken,        persistence);
  setItem(STORAGE_KEYS.refreshToken, data.refreshToken,       persistence);
  setItem(STORAGE_KEYS.user,         JSON.stringify(data.user), persistence);
  setItem(STORAGE_KEYS.persistence,  persistence,             persistence);
}

export const authService = {
  /** Create a new account. Tokens persist in localStorage. */
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    // _skipAuth → don't run the refresh-on-401 flow for unauthenticated endpoints.
    const { data } = await api.post<AuthResponse>("/auth/signup", payload, { _skipAuth: true });
    persistSession(data, "local");
    return data;
  },

  /**
   * Log in with email + password.
   * `remember = true`  → localStorage (durable across browser restarts)
   * `remember = false` → sessionStorage (cleared on tab close)
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", payload, { _skipAuth: true });
    persistSession(data, payload.remember ? "local" : "session");
    return data;
  },

  /**
   * Manually refresh the access token.
   * The Axios response interceptor calls /auth/refresh automatically on 401,
   * so most callers won't need this — it's exposed for cases where code wants
   * to proactively refresh (e.g. on tab focus or before a long upload).
   */
  async refresh(): Promise<string> {
    const refreshToken = getItem(STORAGE_KEYS.refreshToken);
    if (!refreshToken) throw new Error("No refresh token available");

    const { data } = await api.post<RefreshResponse>(
      "/auth/refresh",
      { refreshToken } satisfies RefreshPayload,
      { _skipAuth: true },
    );

    setItem(STORAGE_KEYS.accessToken, data.accessToken, getCurrentPersistence());
    return data.accessToken;
  },

  /**
   * Log the user out.
   * 1. POST /auth/logout (Bearer token attached by the request interceptor).
   * 2. Always clear local session — even if the server call fails — so the
   *    client never sits in a half-logged-in state.
   */
  async logout(): Promise<void> {
    try {
      await api.post<{ success: boolean }>("/auth/logout");
    } finally {
      clearSession();
    }
  },

  /** Read the cached user (synchronous, browser-only). */
  getCurrentUser(): AuthUser | null {
    const raw = getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },

  /** Quick check used by route guards. */
  isAuthenticated(): boolean {
    return !!getItem(STORAGE_KEYS.accessToken);
  },
};
