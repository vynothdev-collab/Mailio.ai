import { api } from "./api";
import type { UserRole } from "@/src/types/user";

export interface EnterpriseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  enterpriseId: string | null;
  isActive: boolean;
  emailVerified: boolean;
  creditLimit: number | null;
  creditsUsed: number;
  creditsRemaining: number | null;
  creditExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateEnterpriseUserPayload {
  name: string;
  email: string;
  password: string;
  creditAllocation?: number;
}

export interface EnterpriseOverview {
  enterprise: {
    id: string;
    name: string;
    domain: string | null;
    creditBalance: number;
    creditsUsed: number;
  };
  users: { total: number; admins: number; members: number; active: number };
  jobs: { total: number; completed: number; failed: number; totalEmailsInJobs: number };
  verifications: {
    total: number;
    valid: number;
    invalid: number;
    catchall: number;
    unknown: number;
  };
}

export interface EnterpriseLedgerEntry {
  id: string;
  type: string;
  reason: string;
  delta: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface EnterpriseCreditSummary {
  totalPurchased: number;
  enterprisePool: number;
  totalAllocated: number;
  totalUsed: number;
  adminUsable: number;
  expiresAt: string | null;
  daysRemaining: number | null;
  users: Array<{
    id: string;
    name: string;
    email: string;
    allocated: number;
    used: number;
    remaining: number;
    expiresAt: string | null;
  }>;
}

export interface PurchasePlanResult {
  needsReallocation: boolean;
  creditBalance: number;
  expiresAt: string;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    previousAllocation: number;
    used: number;
  }>;
}

export const enterpriseService = {
  async listUsers(page = 1, limit = 50): Promise<Paginated<EnterpriseUser>> {
    const { data } = await api.get<Paginated<EnterpriseUser>>("/enterprise/users", {
      params: { page, limit },
    });
    return data;
  },

  async createUser(payload: CreateEnterpriseUserPayload): Promise<EnterpriseUser> {
    const { data } = await api.post<EnterpriseUser>("/enterprise/users", payload);
    return data;
  },

  async getOverview(): Promise<EnterpriseOverview> {
    const { data } = await api.get<EnterpriseOverview>("/enterprise/overview");
    return data;
  },

  async getLedger(page = 1, limit = 50): Promise<Paginated<EnterpriseLedgerEntry>> {
    const { data } = await api.get<Paginated<EnterpriseLedgerEntry>>("/enterprise/credits/ledger", {
      params: { page, limit },
    });
    return data;
  },

  async getCreditSummary(): Promise<EnterpriseCreditSummary> {
    const { data } = await api.get<EnterpriseCreditSummary>("/enterprise/credits/summary");
    return data;
  },

  async allocateCredits(userId: string, amount: number): Promise<void> {
    await api.post("/enterprise/credits/allocate", { userId, amount });
  },

  async purchasePlan(planId: string): Promise<PurchasePlanResult> {
    const { data } = await api.post<PurchasePlanResult>("/enterprise/credits/purchase", { planId });
    return data;
  },

  async purchaseTopup(planId: string): Promise<{ success: boolean }> {
    const { data } = await api.post("/enterprise/credits/topup", { planId });
    return data;
  },

  async getCurrentSubscription(): Promise<import("./billingService").CurrentSubscription> {
    const { data } = await api.get("/enterprise/credits/subscription");
    return data;
  },

  async confirmReallocation(
    planId: string,
    allocations: Array<{ userId: string; amount: number }>
  ): Promise<{ creditBalance: number; expiresAt: string }> {
    const { data } = await api.post<{ creditBalance: number; expiresAt: string }>(
      "/enterprise/credits/reallocate",
      { planId, allocations }
    );
    return data;
  },

  async addExistingUser(email: string): Promise<EnterpriseUser> {
    const { data } = await api.post<EnterpriseUser>("/enterprise/users/add-existing", { email });
    return data;
  },

  async softDeleteUser(userId: string): Promise<void> {
    await api.delete(`/enterprise/users/${userId}`);
  },

  async toggleUserStatus(userId: string): Promise<EnterpriseUser> {
    const { data } = await api.patch<EnterpriseUser>(`/enterprise/users/${userId}/status`);
    return data;
  },

  async updateUserDetails(
    userId: string,
    payload: { name?: string; email?: string }
  ): Promise<EnterpriseUser> {
    const { data } = await api.patch<EnterpriseUser>(`/enterprise/users/${userId}`, payload);
    return data;
  },

  async changeUserPassword(userId: string, password: string): Promise<void> {
    await api.post(`/enterprise/users/${userId}/change-password`, { password });
  },

  async removeUser(userId: string): Promise<void> {
    await api.delete(`/enterprise/users/${userId}`);
  },
};
