export type EmailStatus  = "valid" | "invalid" | "risky" | "disposable" | "unknown";
export type RiskLevel    = "low" | "medium" | "high";
// "info" added so neutral checks (e.g. catch-all unknown) can be styled.
export type CheckStatus  = "pass" | "fail" | "warning" | "info";

export interface CheckItem {
  key:      string;
  label:    string;
  value:    string;
  status:   CheckStatus;
  /** Optional — if missing we fall back to a default icon by check key. */
  iconName?: string;
}

export interface VerificationResult {
  id?:         string;
  email:       string;
  status:      EmailStatus;
  /** Display string, e.g. "82%" / "High" — formatted by the service mapper. */
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
