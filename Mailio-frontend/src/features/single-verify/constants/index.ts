import type { EmailStatus, RiskLevel } from "../types";

export const EMAIL_STATUS_CONFIG: Record<
  EmailStatus,
  { label: string; className: string }
> = {
  valid:       { label: "Valid",       className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  invalid:     { label: "Invalid",     className: "bg-red-50 text-red-600 border-red-100"             },
  risky:       { label: "Risky",       className: "bg-amber-50 text-amber-700 border-amber-100"       },
  disposable:  { label: "Disposable",  className: "bg-violet-50 text-violet-700 border-violet-100"    },
  unknown:     { label: "Unknown",     className: "bg-slate-50 text-slate-600 border-slate-200"       },
};

export const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; dotColor: string; textColor: string }
> = {
  low:    { label: "Low",    dotColor: "bg-emerald-500", textColor: "text-emerald-600" },
  medium: { label: "Medium", dotColor: "bg-amber-400",   textColor: "text-amber-600"   },
  high:   { label: "High",   dotColor: "bg-red-500",     textColor: "text-red-600"     },
};

export const PERFORMED_CHECKS = ["Domain", "Mailbox"] as const;
