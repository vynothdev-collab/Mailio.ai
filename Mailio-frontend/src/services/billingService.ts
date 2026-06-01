import { api } from "./api";

export type PlanType = "USER" | "ENTERPRISE";

export interface BillingPlan {
  id: string;
  name: string;
  planType: PlanType;
  price: number;
  currency: string;
  credits: number;
  validityDays: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
}

export interface ActivatePlanResult {
  success: boolean;
  plan: BillingPlan;
  creditBalance: number;
}

export type CreditTxType =
  | "ALLOCATION"
  | "RESERVATION"
  | "DEDUCTION"
  | "REFUND"
  | "ADJUSTMENT";

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

  getHistory: async (page = 1, limit = 20): Promise<PaginatedHistory> => {
    const { data } = await api.get<PaginatedHistory>(`/billing/history?page=${page}&limit=${limit}`);
    return data;
  },
};
