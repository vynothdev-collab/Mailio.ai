import { api } from "./api";
import { STORAGE_KEYS, clearSession, getItem, setItem } from "@/src/utils/storage";
import type {
  AuthResponse,
  LoginPayload,
  RefreshPayload,
  RefreshResponse,
  SignupPayload,
} from "@/src/types/auth";

function persistSession(data: AuthResponse): void {
  setItem(STORAGE_KEYS.accessToken,  data.accessToken);
  setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
}

export const authService = {
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/signup", payload, { _skipAuth: true });
    persistSession(data);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", payload, { _skipAuth: true });
    persistSession(data);
    return data;
  },

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

  async logout(): Promise<void> {
    try {
      await api.post<{ success: boolean }>("/auth/logout");
    } finally {
      clearSession();
    }
  },
};
