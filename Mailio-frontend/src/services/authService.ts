import { api } from "./api";
import { STORAGE_KEYS, clearSession, getItem, setItem } from "@/src/utils/storage";
import type {
  AuthResponse,
  GoogleLoginPayload,
  LinkedinLoginPayload,
  LoginPayload,
  MessageResponse,
  RefreshPayload,
  RefreshResponse,
  ResendOtpPayload,
  SignupPayload,
  SignupResponse,
  VerifyEmailPayload,
} from "@/src/types/auth";

function persistSession(data: AuthResponse): void {
  setItem(STORAGE_KEYS.accessToken,  data.accessToken);
  setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
}

export const authService = {
  async signup(payload: SignupPayload): Promise<SignupResponse> {
    const { data } = await api.post<SignupResponse>("/auth/signup", payload, { _skipAuth: true });
    return data;
  },

  async verifyEmail(payload: VerifyEmailPayload): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>("/auth/verify-email", payload, { _skipAuth: true });
    return data;
  },

  async resendVerificationOtp(payload: ResendOtpPayload): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>("/auth/resend-verification-otp", payload, { _skipAuth: true });
    return data;
  },

  async getOtpStatus(email: string): Promise<{ remainingSeconds: number; sendCount: number }> {
    const { data } = await api.get<{ remainingSeconds: number; sendCount: number }>(
      `/auth/otp-status?email=${encodeURIComponent(email)}`,
      { _skipAuth: true },
    );
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", payload, { _skipAuth: true });
    persistSession(data);
    return data;
  },

  async googleLogin(payload: GoogleLoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/google", payload, { _skipAuth: true });
    persistSession(data);
    return data;
  },

  async linkedinLogin(payload: LinkedinLoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(
      "/auth/linkedin/callback",
      payload,
      { _skipAuth: true },
    );
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
