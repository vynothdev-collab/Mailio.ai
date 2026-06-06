import { api } from "./api";

export type PlanType = "USER" | "ENTERPRISE";
export type PlanCategory = "VALIDITY_BASED" | "TOPUP";
export type SubscriptionStatus = "QUEUED" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface BillingPlan {
  id: string;
  name: string;
  planType: PlanType;
  planCategory: PlanCategory;
  price: number;
  currency: string;
  credits: number;
  validityDays: number | null;
  description: string | null;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface SubscriptionView {
  id: string;
  planId: string;
  planName: string;
  planCategory: PlanCategory;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  parentSubscriptionId: string | null;
}

export interface CurrentSubscription {
  activeBase: SubscriptionView | null;
  activeTopups: SubscriptionView[];
  queued: SubscriptionView[];
  totals: {
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
    expiresAt: string | null;
  };
}

export interface ActivatePlanResult {
  success: boolean;
  plan: BillingPlan;
  creditBalance: number;
}

export type CreditTxType = "ALLOCATION" | "RESERVATION" | "DEDUCTION" | "REFUND" | "ADJUSTMENT";

export interface CreditHistoryEntry {
  id: string;
  type: CreditTxType;
  reason: string;
  delta: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export interface PaginatedHistory {
  data: CreditHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

export const billingService = {
  getPlans: async (): Promise<BillingPlan[]> => {
    const { data } = await api.get<BillingPlan[]>("/billing/plans");
    return data;
  },

  activatePlan: async (planId: string): Promise<ActivatePlanResult> => {
    const { data } = await api.post<ActivatePlanResult>(`/billing/plans/${planId}/activate`);
    return data;
  },

  purchaseValidityPlan: async (
    planId: string
  ): Promise<{ success: boolean; subscription: SubscriptionView }> => {
    const { data } = await api.post(`/billing/plans/${planId}/purchase`);
    return data;
  },

  purchaseTopup: async (
    planId: string
  ): Promise<{ success: boolean; subscription: SubscriptionView }> => {
    const { data } = await api.post(`/billing/plans/${planId}/topup`);
    return data;
  },

  getCurrentSubscription: async (): Promise<CurrentSubscription> => {
    const { data } = await api.get<CurrentSubscription>(`/billing/subscription`);
    return data;
  },

  getHistory: async (page = 1, limit = 20): Promise<PaginatedHistory> => {
    const { data } = await api.get<PaginatedHistory>(
      `/billing/history?page=${page}&limit=${limit}`
    );
    return data;
  },
};
