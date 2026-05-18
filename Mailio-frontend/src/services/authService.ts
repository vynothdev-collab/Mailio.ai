// Auth service — thin wrapper around the API for auth endpoints.
// Keeps components free of axios/url details and centralizes token persistence.

import { api } from "./api";
import { STORAGE_KEYS, clearSession, getItem, setItem } from "@/src/utils/storage";
import type {
  AuthResponse,
  LoginPayload,
  RefreshPayload,
  RefreshResponse,
  SignupPayload,
} from "@/src/types/auth";

/** Persist tokens to the tab's sessionStorage. User profile is fetched fresh from /users/me. */
function persistSession(data: AuthResponse): void {
  setItem(STORAGE_KEYS.accessToken,  data.accessToken);
  setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
}

export const authService = {
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    // _skipAuth → don't run the refresh-on-401 flow for unauthenticated endpoints.
    const { data } = await api.post<AuthResponse>("/auth/signup", payload, { _skipAuth: true });
    persistSession(data);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", payload, { _skipAuth: true });
    persistSession(data);
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

    setItem(STORAGE_KEYS.accessToken, data.accessToken);
    return data.accessToken;
  },

  /**
   * Log the user out.
   * Always clear local session — even if the server call fails — so the
   * client never sits in a half-logged-in state.
   */
  async logout(): Promise<void> {
    try {
      await api.post<{ success: boolean }>("/auth/logout");
    } finally {
      clearSession();
    }
  },
};
