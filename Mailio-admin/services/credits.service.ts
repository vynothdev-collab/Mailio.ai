import { apiService } from "./api";

export type AccountType = "USER" | "ENTERPRISE";
export type CreditTxType =
  | "ALLOCATION"
  | "RESERVATION"
  | "DEDUCTION"
  | "REFUND"
  | "ADJUSTMENT";

export interface CreditLedgerEntry {
  id:            string;
  accountType:   AccountType;
  accountId:     string;
  type:          CreditTxType;
  reason:        string;
  delta:         number;
  balanceAfter:  number;
  referenceType: string | null;
  referenceId:   string | null;
  description:   string | null;
  createdByAdminId: string | null;
  createdByUserId:  string | null;
  createdAt:     string;
}

export interface Paginated<T> {
  data:  T[];
  total: number;
  page:  number;
  limit: number;
}

export interface CreditSummary {
  users:       { outstandingBalance: number; lifetimeUsed: number };
  enterprises: { outstandingBalance: number; lifetimeUsed: number };
}

export interface AllocateUserPayload {
  userId: string;
  amount: number;
  description?: string;
}

export interface AllocateEnterprisePayload {
  enterpriseId: string;
  amount: number;
  description?: string;
}

export interface AllocateResult {
  success: boolean;
  amount: number;
  balanceAfter: number;
  userId?: string;
  enterpriseId?: string;
}

export const creditsService = {
  allocateUser: (payload: AllocateUserPayload) =>
    apiService.post<AllocateResult>("/admin/credits/allocate/user", payload),

  allocateEnterprise: (payload: AllocateEnterprisePayload) =>
    apiService.post<AllocateResult>(
      "/admin/credits/allocate/enterprise",
      payload,
    ),

  ledger: (
    opts: { accountType?: AccountType; accountId?: string; page?: number; limit?: number } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.accountType) params.set("accountType", opts.accountType);
    if (opts.accountId) params.set("accountId", opts.accountId);
    params.set("page", String(opts.page ?? 1));
    params.set("limit", String(opts.limit ?? 50));
    return apiService.get<Paginated<CreditLedgerEntry>>(
      `/admin/credits/ledger?${params}`,
    );
  },

  summary: () => apiService.get<CreditSummary>("/admin/credits/summary"),
};
