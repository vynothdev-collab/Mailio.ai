import { apiService } from "./api";

export type UserRole =
  | "USER"
  | "ENTERPRISE_USER"
  | "ENTERPRISE_ADMIN"
  | "SUPER_ADMIN";

export interface AdminUserRow {
  id:            string;
  name:          string;
  email:         string;
  plan:          string;
  role:          UserRole;
  enterpriseId:  string | null;
  creditBalance: number | string;
  creditsUsed:   number | string;
  isActive:      boolean;
  emailVerified: boolean;
  provider:      string;
  createdAt:     string;
}

export interface Paginated<T> {
  data:  T[];
  total: number;
  page:  number;
  limit: number;
}

export interface CreateUserPayload {
  name:     string;
  email:    string;
  password: string;
  role:     UserRole;
  enterpriseId?: string;
  initialCredits?: number;
}

export interface AdminUsersQuery {
  search?:       string;
  plan?:         string;
  role?:         UserRole;
  enterpriseId?: string;
  isActive?:     string;
  page?:         number;
  limit?:        number;
}

export const adminUsersExtService = {
  list: (q: AdminUsersQuery = {}) => {
    const params = new URLSearchParams();
    if (q.search) params.set("search", q.search);
    if (q.plan) params.set("plan", q.plan);
    if (q.role) params.set("role", q.role);
    if (q.enterpriseId) params.set("enterpriseId", q.enterpriseId);
    if (q.isActive !== undefined && q.isActive !== "")
      params.set("isActive", q.isActive);
    params.set("page", String(q.page ?? 1));
    params.set("limit", String(q.limit ?? 20));
    return apiService.get<Paginated<AdminUserRow>>(`/admin/users?${params}`);
  },

  create: (payload: CreateUserPayload) =>
    apiService.post<AdminUserRow>("/admin/users", payload),
};
