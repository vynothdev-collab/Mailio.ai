interface AuthUser {
  id:        string;
  name:      string;
  email:     string;
  plan:      string;
  avatarUrl?: string | null;
  provider?: "LOCAL" | "GOOGLE" | "LINKEDIN";
}

export interface GoogleLoginPayload {
  idToken: string;
  remember?: boolean;
}

export interface LinkedinLoginPayload {
  code: string;
  redirectUri: string;
  remember?: boolean;
}

export interface SignupPayload {
  fullName: string;
  email:    string;
  password: string;
}

export interface LoginPayload {
  email:    string;
  password: string;
  remember: boolean;
}

export interface AuthResponse {
  accessToken:  string;
  refreshToken: string;
  user:         AuthUser;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface SignupResponse {
  success: boolean;
  email:   string;
  message: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp:   string;
}

export interface ResendOtpPayload {
  email: string;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email:       string;
  otp:         string;
  newPassword: string;
}

export interface ApiError {
  status:  number;
  message: string;
}
