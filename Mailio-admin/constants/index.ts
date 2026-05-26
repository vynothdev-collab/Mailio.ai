export const APP_NAME = "Mailio Admin";

export const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: "▪" },
] as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
} as const;

export const COOKIE_NAMES = {
  ACCESS_TOKEN: "access_token",
  SESSION_TOKEN: "session_token",
  USER: "admin_user",
} as const;

export const AUTH_ENDPOINTS = {
  LOGIN: "/auth/admin/login",
  VERIFY_OTP: "/auth/admin/verify-otp",
  RESEND_OTP: "/auth/admin/resend-otp",
  REFRESH_TOKEN: "/auth/admin/refresh-token",
  LOGOUT: "/auth/admin/logout",
  ME: "/auth/admin/me",
} as const;

export const OTP_RESEND_COOLDOWN = 60;
