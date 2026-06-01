import { apiService } from "./api";

export interface Enterprise {
  id:            string;
  name:          string;
  domain:        string | null;
  isActive:      boolean;
  creditBalance: number;
  creditsUsed:   number;
  membersCount:  number;
  adminsCount?:  number;
  usersCount?:   number;
  createdAt:     string;
  updatedAt:     string;
}

export interface Paginated<T> {
  data:  T[];
  total: number;
  page:  number;
  limit: number;
}

export interface CreateEnterprisePayload {
  name: string;
  domain?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  initialCredits?: number;
}

export interface UpdateEnterprisePayload {
  name?: string;
  domain?: string;
  isActive?: boolean;
}

export interface EnterpriseMember {
  id:        string;
  name:      string;
  email:     string;
  role:      "ENTERPRISE_USER" | "ENTERPRISE_ADMIN";
  isActive:  boolean;
  createdAt: string;
}

export const enterprisesService = {
  list: (q: { search?: string; isActive?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (q.search) params.set("search", q.search);
    if (q.isActive) params.set("isActive", q.isActive);
    params.set("page", String(q.page ?? 1));
    params.set("limit", String(q.limit ?? 20));
    return apiService.get<Paginated<Enterprise>>(`/admin/enterprises?${params}`);
  },

  findOne: (id: string) =>
    apiService.get<Enterprise>(`/admin/enterprises/${id}`),

  create: (payload: CreateEnterprisePayload) =>
    apiService.post<Enterprise>("/admin/enterprises", payload),

  update: (id: string, payload: UpdateEnterprisePayload) =>
    apiService.patch<Enterprise>(`/admin/enterprises/${id}`, payload),

  softDelete: (id: string) =>
    apiService.delete<{ success: boolean }>(`/admin/enterprises/${id}`),

  members: (id: string, page = 1, limit = 50, role?: string) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (role) params.set("role", role);
    return apiService.get<Paginated<EnterpriseMember>>(
      `/admin/enterprises/${id}/members?${params}`,
    );
  },
};
