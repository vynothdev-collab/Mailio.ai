export type UserRole = "USER" | "ENTERPRISE_USER" | "ENTERPRISE_ADMIN" | "SUPER_ADMIN";

export interface EnterpriseSummary {
  id: string;
  name: string;
  creditBalance: number;
  creditsUsed: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  plan: string;
  role: UserRole;
  enterpriseId: string | null;
  enterprise: EnterpriseSummary | null;

  creditBalance: number;
  creditsUsed: number;

  effectiveCreditBalance: number;
  isActive: boolean;
  hasPassword: boolean;

  profileImageUrl: string | null;

  profileImageKey: string | null;

  profileImageViewUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
