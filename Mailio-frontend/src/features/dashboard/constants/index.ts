import type { NavItem, UsageInfo, VerificationStatus } from "../types";

// ── Navigation ─────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",     label: "Dashboard",     href: "/dashboard",     iconName: "LayoutDashboard" },
  { id: "single-verify", label: "Single Verify", href: "/single-verify", iconName: "Mail" },
  { id: "bulk-verify",   label: "Bulk Verify",   href: "/bulk-verify",   iconName: "MailOpen" },
  { id: "results",       label: "Results",       href: "/results",       iconName: "BarChart3" },
  { id: "usage",         label: "Usage",         href: "/usage",         iconName: "TrendingUp" },
  { id: "billing",       label: "Billing",       href: "/billing",       iconName: "CreditCard" },
  { id: "settings",      label: "Settings",      href: "/settings",      iconName: "Settings" },
];

// ── Status badge config ────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; className: string; dotColor: string }
> = {
  processing: {
    label: "Processing",
    className: "bg-blue-50 text-blue-600 border border-blue-100",
    dotColor: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    dotColor: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-500 border border-red-100",
    dotColor: "bg-red-500",
  },
  queued: {
    label: "Queued",
    className: "bg-slate-50 text-slate-500 border border-slate-200",
    dotColor: "bg-slate-400",
  },
};

// ── Chart / results colors ─────────────────────────────────────────────────

export const CHART_COLORS = {
  valid:       "#10b981",
  invalid:     "#ef4444",
  risky:       "#f59e0b",
  disposable:  "#8b5cf6",
} as const;

// ── Active verification summary row config ─────────────────────────────────

export const SUMMARY_CONFIG = [
  { key: "valid"      as const, label: "Valid",       textColor: "text-emerald-600", bgColor: "bg-emerald-50" },
  { key: "invalid"    as const, label: "Invalid",     textColor: "text-red-500",     bgColor: "bg-red-50"     },
  { key: "risky"      as const, label: "Risky",       textColor: "text-amber-600",   bgColor: "bg-amber-50"   },
  { key: "disposable" as const, label: "Disposable",  textColor: "text-violet-600",  bgColor: "bg-violet-50"  },
] as const;

// ── Plan usage ─────────────────────────────────────────────────────────────

export const USAGE_INFO: UsageInfo = {
  used:  8_240,
  total: 10_000,
  plan:  "Pro Plan",
};

// ── Upload constraints ─────────────────────────────────────────────────────

export const UPLOAD_CONFIG = {
  acceptedFormats: [".csv", ".txt"],
  maxSizeMb: 50,
} as const;
