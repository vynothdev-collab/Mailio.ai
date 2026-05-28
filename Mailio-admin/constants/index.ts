export const APP_NAME = "Mailio Admin";

export const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "User Management", href: "/users", icon: "Users" },
  { label: "Enterprise Management", href: "/enterprise", icon: "Building2" },
  { label: "Plans Management", href: "/plans", icon: "ClipboardList" },
  { label: "Offers / Discounts", href: "/offers", icon: "Tag" },
  { label: "Credits & Usage", href: "/credits", icon: "Coins" },
  { label: "Reports & Analytics", href: "/reports", icon: "BarChart3" },
  { label: "Subscription Expiry", href: "/expiry", icon: "CalendarClock" },
  { label: "Activity Logs", href: "/activity-logs", icon: "FileText" },
  { label: "Live Chat", href: "/live-chat", icon: "MessageSquare" },
  { label: "Submitted Tickets", href: "/tickets", icon: "Ticket" },
  { label: "Settings", href: "/settings", icon: "Settings" },
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
  LIVE_CHAT: "/live-chat",
  TICKETS: "/tickets",
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

export const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard Overview", subtitle: "Welcome back, Admin! Here's what's happening with your platform." },
  "/users": { title: "User Management", subtitle: "Manage and monitor single user accounts, permissions, and activity." },
  "/enterprise": { title: "Enterprise Management", subtitle: "Manage enterprise accounts, team users, credits, and subscriptions." },
  "/plans": { title: "Plans Management", subtitle: "Create and manage single-user and enterprise plans with flexible pricing and limits." },
  "/offers": { title: "Offers / Discounts", subtitle: "Create and track promotional offers for both single users and enterprise accounts." },
  "/credits": { title: "Credits & Usage", subtitle: "Monitor credit usage, assignments, and transactions for single users and enterprise accounts." },
  "/reports": { title: "Reports & Analytics", subtitle: "Track performance, engagement, and platform insights with detailed reports." },
  "/expiry": { title: "Subscription Expiry", subtitle: "Monitor and manage upcoming subscription expiries." },
  "/activity-logs": { title: "Activity Logs", subtitle: "Track and review all user and enterprise activities across the platform." },
  "/live-chat": { title: "Live Chat Management", subtitle: "Monitor and reply to user chats in real-time." },
  "/tickets": { title: "Submitted Tickets Management", subtitle: "Review, assign, and resolve support tickets submitted by single users." },
  "/settings": { title: "Settings", subtitle: "Manage platform configuration and preferences." },
};

export const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PRO: "Pro",
  BUSINESS: "Business",
  ULTIMATE: "Ultimate",
  ENTERPRISE: "Enterprise",
  ENTERPRISE_PLUS: "Enterprise Plus",
  CUSTOM: "Custom",
};

export const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-600",
  BASIC: "bg-sky-100 text-sky-700",
  PRO: "bg-blue-100 text-blue-700",
  BUSINESS: "bg-indigo-100 text-indigo-700",
  ULTIMATE: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-violet-100 text-violet-700",
  ENTERPRISE_PLUS: "bg-fuchsia-100 text-fuchsia-700",
  CUSTOM: "bg-amber-100 text-amber-700",
};
