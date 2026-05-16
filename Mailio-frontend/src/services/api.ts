// Central Axios instance + auth lifecycle.
//
// Responsibilities:
//   1. Inject the current access token on every request.
//   2. On 401, transparently refresh the access token via /auth/refresh
//      and retry the original request.
//   3. Coalesce concurrent refreshes — if N requests 401 at once, only
//      ONE refresh call is made and all callers wait on the same promise.
//   4. If the refresh itself fails, clear the session and bounce the user
//      to /login (with a session-expired toast).

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import type {
  ApiError,
  RefreshPayload,
  RefreshResponse,
} from "@/src/types/auth";
import {
  STORAGE_KEYS,
  clearSession,
  getCurrentPersistence,
  getItem,
  setItem,
} from "@/src/utils/storage";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("[api] NEXT_PUBLIC_API_BASE_URL is not defined.");
}

/**
 * Extend Axios's per-request config with bookkeeping flags so the
 * interceptor can recognize:
 *   - `_retry`     → request has already been retried after a refresh,
 *                    don't loop.
 *   - `_skipAuth`  → don't try to refresh on 401 (used by /auth/refresh
 *                    itself and by public endpoints like login/signup).
 */
declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?:    boolean;
    _skipAuth?: boolean;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

// ── Request: attach Bearer token if present ────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getItem(STORAGE_KEYS.accessToken);
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// ── Refresh-token concurrency control ──────────────────────────────────────
//
// While a refresh is in flight, additional 401s park themselves on
// `pendingRefresh` instead of starting a second refresh. When the refresh
// resolves, every parked request is retried with the new token.

let pendingRefresh: Promise<string> | null = null;

/**
 * POST /auth/refresh and return the new access token.
 * Bypasses the request interceptor's Bearer injection isn't needed —
 * the body carries the refresh token directly.
 */
async function performRefresh(refreshToken: string): Promise<string> {
  const { data } = await api.post<RefreshResponse>(
    "/auth/refresh",
    { refreshToken } satisfies RefreshPayload,
    { _skipAuth: true } as AxiosRequestConfig, // don't recurse into refresh on 401
  );

  // Persist the new access token into whichever store currently holds the session.
  setItem(STORAGE_KEYS.accessToken, data.accessToken, getCurrentPersistence());
  return data.accessToken;
}

/**
 * Public hook used by the response interceptor.
 * Returns a promise that resolves to a fresh access token.
 * Callers issued during an in-flight refresh share the same promise.
 */
function refreshAccessToken(): Promise<string> {
  if (pendingRefresh) return pendingRefresh;

  const refreshToken = getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) {
    return Promise.reject(new Error("Missing refresh token"));
  }

  pendingRefresh = performRefresh(refreshToken).finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
}

/**
 * Forced logout used when the refresh flow itself fails.
 * Kept here (instead of in authService) so api.ts has no circular import.
 */
function forceLogout(message = "Your session has expired. Please sign in again."): void {
  clearSession();
  if (typeof window !== "undefined") {
    toast.error(message);
    // Hard redirect avoids needing a router instance inside a non-React module.
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }
}

// ── Response: refresh-on-401, normalize errors ─────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    const original = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
      _skipAuth?: boolean;
    }) | undefined;

    const status = error.response?.status ?? 0;

    // ── Try to refresh the access token on 401 ──────────────────────────
    const canAttemptRefresh =
      status === 401 &&
      !!original &&
      !original._retry &&
      !original._skipAuth &&
      !!getItem(STORAGE_KEYS.refreshToken);

    if (canAttemptRefresh) {
      try {
        const newToken = await refreshAccessToken();

        // Retry the original request exactly once with the new token.
        original!._retry = true;
        original!.headers = original!.headers ?? {};
        // AxiosHeaders supports both `.set()` and direct assignment depending on version.
        if (typeof (original!.headers as { set?: unknown }).set === "function") {
          (original!.headers as { set: (k: string, v: string) => void })
            .set("Authorization", `Bearer ${newToken}`);
        } else {
          (original!.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        }

        return api.request(original!);
      } catch {
        // Refresh failed → game over.
        forceLogout();
        const normalized: ApiError = {
          status:  401,
          message: "Session expired. Please sign in again.",
        };
        return Promise.reject(normalized);
      }
    }

    // ── Plain 401 we can't recover from (no refresh token, refresh
    //    endpoint itself, or already-retried request) ────────────────────
    if (status === 401 && !original?._skipAuth) {
      // Avoid disrupting the login/signup pages, where 401 is a normal
      // "wrong credentials" response.
      const onAuthPage =
        typeof window !== "undefined" &&
        /^\/(login|signup|forgot-password)/.test(window.location.pathname);
      if (!onAuthPage) {
        forceLogout();
      } else {
        clearSession();
      }
    }

    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      "Something went wrong. Please try again.";

    const normalized: ApiError = { status, message };
    return Promise.reject(normalized);
  },
);

// Re-exported for convenience.
export { STORAGE_KEYS };
