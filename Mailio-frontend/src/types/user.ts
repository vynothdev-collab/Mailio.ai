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
  createdAt:                string;
  updatedAt:                string;
}
