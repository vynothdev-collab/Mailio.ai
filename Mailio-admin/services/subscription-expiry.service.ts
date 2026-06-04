import { apiService } from "./api";

export type ExpiryTab    = "single" | "enterprise";
export type ExpiryBucket = "TODAY" | "WEEK" | "MONTH" | "EXPIRED" | "ACTIVE" | "ALL";

export interface ExpirySummary {
  expiringToday: number;
  expiringIn7d:  number;
  expiringIn30d: number;
  expired:       number;
}

export interface ExpiryRow {
  subscriptionId:   string;
  accountId:        string;
  accountName:      string;
  accountEmail:     string;
  planId:           string;
  planName:         string;
  startDate:        string;
  endDate:          string;
  status:           "ACTIVE" | "EXPIRED" | "QUEUED" | "CANCELLED";
  bucket:           Exclude<ExpiryBucket, "ALL">;
  totalCredits:     number;
  usedCredits:      number;
  remainingCredits: number;
  daysRemaining:    number;
}

export interface ExpiryListResponse {
  data:  ExpiryRow[];
  total: number;
  page:  number;
  limit: number;
}

export interface ExpiryPlan {
  id:   string;
  name: string;
}

export interface ListExpiryParams {
  search?: string;
  planId?: string;
  bucket?: ExpiryBucket;
  page?:   number;
  limit?:  number;
}

function qs(params: Record<string, unknown>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  return p.toString();
}

export const subscriptionExpiryService = {
  summary: (tab: ExpiryTab) =>
    apiService.get<ExpirySummary>(`/admin/subscription-expiry/summary?tab=${tab}`),

  plans: (tab: ExpiryTab) =>
    apiService.get<ExpiryPlan[]>(`/admin/subscription-expiry/plans?tab=${tab}`),

  users: (params: ListExpiryParams) =>
    apiService.get<ExpiryListResponse>(
      `/admin/subscription-expiry/users?${qs({ ...params })}`,
    ),

  enterprises: (params: ListExpiryParams) =>
    apiService.get<ExpiryListResponse>(
      `/admin/subscription-expiry/enterprises?${qs({ ...params })}`,
    ),
};
