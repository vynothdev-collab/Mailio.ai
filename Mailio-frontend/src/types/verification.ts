export type ApiCheckStatus = "pass" | "fail" | "info";

export interface VerificationCheck {
  key:    string;
  label:  string;
  value:  string;
  status: ApiCheckStatus;
}

export interface VerificationResponse {
  id:          string;
  email:       string;
  status:      string;
  confidence:  number;
  description: string;
  verifiedAt:  string;
  durationMs:  number;
  checks:      VerificationCheck[];
}
