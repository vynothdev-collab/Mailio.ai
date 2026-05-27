import { apiService } from "./api";
import type {
  DashboardOverview,
  PaginatedResponse,
  UserRow,
  UserDetail,
  ActivityLog,
} from "@/types";

export const adminDashboardService = {
  getOverview: (period = "7d", from?: string, to?: string) => {
    const params = new URLSearchParams({ period });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return apiService.get<DashboardOverview>(`/admin/dashboard/overview?${params}`);
  },
};

export interface UsersQuery {
  search?: string;
  plan?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export const adminUsersService = {
  findAll: (q: UsersQuery = {}) => {
    const params = new URLSearchParams();
    if (q.search) params.set("search", q.search);
    if (q.plan) params.set("plan", q.plan);
    if (q.isActive !== undefined && q.isActive !== "") params.set("isActive", q.isActive);
    params.set("page", String(q.page ?? 1));
    params.set("limit", String(q.limit ?? 20));
    return apiService.get<PaginatedResponse<UserRow>>(`/admin/users?${params}`);
  },

  findOne: (id: string) => apiService.get<UserDetail>(`/admin/users/${id}`),

  updateStatus: (id: string, isActive: boolean) =>
    apiService.patch<{ success: boolean }>(`/admin/users/${id}/status`, { isActive }),

  resetPassword: (id: string) =>
    apiService.post<{ tempPassword: string }>(`/admin/users/${id}/reset-password`, {}),

  softDelete: (id: string) =>
    apiService.delete<{ success: boolean }>(`/admin/users/${id}`),
};

export interface ActivityLogsQuery {
  type?: string;
  module?: string;
  page?: number;
  limit?: number;
}

export const adminActivityLogsService = {
  findAll: (q: ActivityLogsQuery = {}) => {
    const params = new URLSearchParams();
    if (q.type) params.set("type", q.type);
    if (q.module) params.set("module", q.module);
    params.set("page", String(q.page ?? 1));
    params.set("limit", String(q.limit ?? 20));
    return apiService.get<PaginatedResponse<ActivityLog>>(`/admin/activity-logs?${params}`);
  },

  getModules: () => apiService.get<string[]>("/admin/activity-logs/modules"),
};
