import type { StatItem } from "../types";

export const MOCK_STATS: StatItem[] = [
  {
    id:           "total-verified",
    label:        "Total Verified",
    value:        "124,580",
    change:       18.6,
    changePeriod: "vs Apr 24 – Apr 30",
    iconName:     "Mail",
    iconColor:    "text-blue-600",
    iconBgColor:  "bg-blue-50",
  },
  {
    id:           "valid-rate",
    label:        "Valid Rate",
    value:        "94.2%",
    change:       2.7,
    changePeriod: "vs Apr 24 – Apr 30",
    iconName:     "ShieldCheck",
    iconColor:    "text-emerald-600",
    iconBgColor:  "bg-emerald-50",
  },
  {
    id:           "risky-emails",
    label:        "Risky Emails",
    value:        "3,216",
    change:       -6.3,
    changePeriod: "vs Apr 24 – Apr 30",
    iconName:     "AlertTriangle",
    iconColor:    "text-amber-600",
    iconBgColor:  "bg-amber-50",
  },
];
