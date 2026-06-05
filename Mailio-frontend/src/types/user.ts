export type UserRole =
  | "USER"
  | "ENTERPRISE_USER"
  | "ENTERPRISE_ADMIN"
  | "SUPER_ADMIN";

export interface EnterpriseSummary {
  id:            string;
  name:          string;
  creditBalance: number;
  creditsUsed:   number;
}

export interface UserProfile {
  id:                       string;
  email:                    string;
  name:                     string;
  plan:                     string;
  role:                     UserRole;
  enterpriseId:             string | null;
  enterprise:               EnterpriseSummary | null;
  /** Personal credit balance. Used directly only for role=USER. */
  creditBalance:            number;
  creditsUsed:              number;
  /**
   * Resolved balance the user actually draws from. For enterprise members
   * this is the shared enterprise balance; for normal users it's their own.
   * Always prefer this in display.
   */
  effectiveCreditBalance:   number;
  isActive:                 boolean;
  hasPassword:              boolean;
  /** Cached static URL. Null when the bucket is private — use profileImageViewUrl instead. */
  profileImageUrl:          string | null;
  /** S3 object key. Backend uses it for deletion on re-upload and for signing reads. */
  profileImageKey:          string | null;
  /**
   * Short-lived signed URL the FE should render. Backend issues a fresh one
   * each `GET /users/me`. Falls back to profileImageUrl for public buckets.
   */
  profileImageViewUrl:      string | null;
  createdAt:                string;
  updatedAt:                string;
}
