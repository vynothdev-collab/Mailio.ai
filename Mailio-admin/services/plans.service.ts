import { apiService } from "./api";

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
  isPopular: boolean;
  sortOrder: number;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanPayload {
  name: string;
  planType: PlanType;
  price: number;
  currency?: string;
  credits: number;
  validityDays: number;
  features?: string[];
  isActive?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>;

export const plansService = {
  list: () => apiService.get<BillingPlan[]>("/admin/plans"),

  create: (payload: CreatePlanPayload) =>
    apiService.post<BillingPlan>("/admin/plans", payload),

  update: (id: string, payload: UpdatePlanPayload) =>
    apiService.patch<BillingPlan>(`/admin/plans/${id}`, payload),

  setPopular: (id: string) =>
    apiService.patch<BillingPlan>(`/admin/plans/${id}/set-popular`, {}),

  toggle: (id: string) =>
    apiService.patch<BillingPlan>(`/admin/plans/${id}/toggle`, {}),

  delete: (id: string) =>
    apiService.delete<void>(`/admin/plans/${id}`),
};
