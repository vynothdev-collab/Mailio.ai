import { getCookie } from "@/lib/cookies";
import { COOKIE_NAMES, ROUTES } from "@/constants";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  _isRetry?: boolean;
}

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.href = ROUTES.LOGIN;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, _isRetry = false } = options;

  const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);

  const config: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401 && !_isRetry) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        pendingQueue.push(async () => {
          try {
            resolve(await request<T>(endpoint, { ...options, _isRetry: true }));
          } catch (e) {
            reject(e);
          }
        });
      });
    }

    isRefreshing = true;
    const refreshed = await refreshTokens();
    isRefreshing = false;

    if (refreshed) {
      const queued = pendingQueue.splice(0);
      queued.forEach((fn) => fn());
      return request<T>(endpoint, { ...options, _isRetry: true });
    }

    pendingQueue = [];
    redirectToLogin();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const apiService = {
  get: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "GET", headers }),

  post: <T>(endpoint: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "POST", body, headers }),

  put: <T>(endpoint: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "PUT", body, headers }),

  patch: <T>(endpoint: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "PATCH", body, headers }),

  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "DELETE", headers }),
};
