export const APP_NAME = "Mailio Admin";

export const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Users", href: "/users", icon: "users" },
  { label: "Enterprise", href: "/enterprise", icon: "enterprise" },
  { label: "Plans", href: "/plans", icon: "plans" },
  { label: "Offers & Discounts", href: "/offers", icon: "offers" },
  { label: "Credits & Usage", href: "/credits", icon: "credits" },
  { label: "Reports & Analytics", href: "/reports", icon: "reports" },
  { label: "Subscription Expiry", href: "/expiry", icon: "expiry" },
  { label: "Settings", href: "/settings", icon: "settings" },
  { label: "Activity Logs", href: "/activity-logs", icon: "logs" },
] as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  USERS: "/users",
  ENTERPRISE: "/enterprise",
  PLANS: "/plans",
  OFFERS: "/offers",
  CREDITS: "/credits",
  REPORTS: "/reports",
  EXPIRY: "/expiry",
  SETTINGS: "/settings",
  ACTIVITY_LOGS: "/activity-logs",
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

export const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  PRO: "Pro",
  ULTIMATE: "Ultimate",
};

export const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-600",
  PRO: "bg-blue-100 text-blue-700",
  ULTIMATE: "bg-purple-100 text-purple-700",
};
