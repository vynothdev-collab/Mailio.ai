// Raw verification contracts as returned by the backend.
// Kept separate from the feature-level UI types so the service layer
// is the only place that knows the exact wire shape.

export type ApiCheckStatus = "pass" | "fail" | "info";

export interface VerificationCheck {
  key:    string;
  label:  string;
  value:  string;
  status: ApiCheckStatus;
}

/** POST /verify/single response */
export interface VerificationResponse {
  id:          string;
  email:       string;
  /** Backend may return: valid | invalid | risky | disposable | unknown */
  status:      string;
  /** 0–100 */
  confidence:  number;
  description: string;
  verifiedAt:  string;  // ISO 8601
  durationMs:  number;
  checks:      VerificationCheck[];
}
