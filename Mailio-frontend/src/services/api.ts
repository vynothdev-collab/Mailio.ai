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
  getItem,
  setItem,
} from "@/src/utils/storage";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  console.warn("[api] NEXT_PUBLIC_API_BASE_URL is not defined.");
}

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

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getItem(STORAGE_KEYS.accessToken);
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let pendingRefresh: Promise<string> | null = null;

async function performRefresh(refreshToken: string): Promise<string> {
  const { data } = await api.post<RefreshResponse>(
    "/auth/refresh",
    { refreshToken } satisfies RefreshPayload,
    { _skipAuth: true } as AxiosRequestConfig,
  );

  setItem(STORAGE_KEYS.accessToken, data.accessToken);
  return data.accessToken;
}

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

function forceLogout(message = "Your session has expired. Please sign in again."): void {
  clearSession();
  if (typeof window !== "undefined") {
    toast.error(message);
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    const original = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
      _skipAuth?: boolean;
    }) | undefined;

    const status = error.response?.status ?? 0;

    const canAttemptRefresh =
      status === 401 &&
      !!original &&
      !original._retry &&
      !original._skipAuth &&
      !!getItem(STORAGE_KEYS.refreshToken);

    if (canAttemptRefresh) {
      try {
        const newToken = await refreshAccessToken();

        original!._retry = true;
        original!.headers = original!.headers ?? {};
        if (typeof (original!.headers as { set?: unknown }).set === "function") {
          (original!.headers as { set: (k: string, v: string) => void })
            .set("Authorization", `Bearer ${newToken}`);
        } else {
          (original!.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        }

        return api.request(original!);
      } catch {
        forceLogout();
        const normalized: ApiError = {
          status:  401,
          message: "Session expired. Please sign in again.",
        };
        return Promise.reject(normalized);
      }
    }

    if (status === 401 && !original?._skipAuth) {
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

export { STORAGE_KEYS };
