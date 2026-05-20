export type EmailStatus  = "valid" | "invalid" | "risky" | "disposable" | "unknown";
export type RiskLevel    = "low" | "medium" | "high";
export type CheckStatus  = "pass" | "fail" | "warning" | "info";

export interface CheckItem {
  key:      string;
  label:    string;
  value:    string;
  status:   CheckStatus;
  iconName?: string;
}

export interface VerificationResult {
  id?:         string;
  email:       string;
  status:      EmailStatus;
  confidence:  string;
  description: string;
  verifiedAt:  string;
  durationMs:  number;
  checks:      CheckItem[];
}

export interface RecentVerification {
  id:         string;
  email:      string;
  status:     EmailStatus;
  risk:       RiskLevel;
  verifiedAt: string;
}

export interface SingleVerifyStat {
  id:           string;
  label:        string;
  value:        string;
  change:       number;
  changePeriod: string;
  iconName:     string;
  iconColor:    string;
  iconBgColor:  string;
}
