import { AUTH_ENDPOINTS } from "@/constants";
import type {
  LoginRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ResendOtpRequest,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ;

async function authPost<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ message: "Request failed" }));
  if (!response.ok) throw new Error(data.message ?? "Request failed");
  return data as T;
}

export const authService = {
  login: (payload: LoginRequest) =>
    authPost<{ message: string }>(AUTH_ENDPOINTS.LOGIN, payload),

  verifyOtp: (payload: VerifyOtpRequest) =>
    authPost<VerifyOtpResponse>(AUTH_ENDPOINTS.VERIFY_OTP, payload),

  resendOtp: (payload: ResendOtpRequest) =>
    authPost<{ message: string }>(AUTH_ENDPOINTS.RESEND_OTP, payload),
};
