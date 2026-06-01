import type { NavItem, UsageInfo, VerificationStatus } from "../types";

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",        label: "Dashboard",        href: "/dashboard",        iconName: "dashboard" },
  { id: "single-verify",    label: "Single Verify",    href: "/single-verify",    iconName: "single-verify" },
  { id: "bulk-verify",      label: "Bulk Verify",      href: "/bulk-verify",      iconName: "bulk-verify" },
  { id: "results",          label: "Results",          href: "/results",          iconName: "results" },
  { id: "usage",            label: "Usage",            href: "/usage",            iconName: "usage" },
  { id: "enterprise-users", label: "Enterprise Users", href: "/enterprise/users", iconName: "users" },
  { id: "billing",          label: "Billing",          href: "/billing",          iconName: "billing" },
  { id: "settings",         label: "Settings",         href: "/settings",         iconName: "settings" },
  { id: "help",             label: "Help & Support",   href: "/help",             iconName: "help" },
];

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

export const CHART_COLORS = {
  valid:       "#10b981",
  invalid:     "#ef4444",
  catchall:       "#f59e0b",
  disposable:  "#8b5cf6",
} as const;

export const SUMMARY_CONFIG = [
  { key: "valid"      as const, label: "Valid",       textColor: "text-emerald-600", bgColor: "bg-emerald-50" },
  { key: "invalid"    as const, label: "Invalid",     textColor: "text-red-500",     bgColor: "bg-red-50"     },
  { key: "catchall"      as const, label: "Catchall",       textColor: "text-amber-600",   bgColor: "bg-amber-50"   },
  { key: "disposable" as const, label: "Disposable",  textColor: "text-violet-600",  bgColor: "bg-violet-50"  },
] as const;

export const USAGE_INFO: UsageInfo = {
  used:  8_240,
  total: 10_000,
  plan:  "Pro Plan",
};

export const UPLOAD_CONFIG = {
  acceptedFormats: [".csv", ".txt"],
  maxSizeMb: 50,
} as const;
