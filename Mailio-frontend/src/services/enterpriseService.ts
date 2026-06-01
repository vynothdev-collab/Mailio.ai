import { api } from "./api";
import type { UserRole } from "@/src/types/user";

export interface EnterpriseUser {
  id:            string;
  name:          string;
  email:         string;
  role:          UserRole;
  enterpriseId:  string | null;
  isActive:      boolean;
  emailVerified: boolean;
  creditsUsed:   number;
  createdAt:     string;
  updatedAt:     string;
}

export interface Paginated<T> {
  data:  T[];
  total: number;
  page:  number;
  limit: number;
}

export interface CreateEnterpriseUserPayload {
  name:     string;
  email:    string;
  password: string;
}

export interface EnterpriseOverview {
  enterprise: {
    id:            string;
    name:          string;
    domain:        string | null;
    creditBalance: number;
    creditsUsed:   number;
  };
  users:         { total: number; admins: number; members: number; active: number };
  jobs:          {
    total: number;
    completed: number;
    failed: number;
    totalEmailsInJobs: number;
  };
  verifications: {
    total: number;
    valid: number;
    invalid: number;
    catchall: number;
    unknown: number;
  };
}

export interface EnterpriseLedgerEntry {
  id:            string;
  type:          string;
  reason:        string;
  delta:         number;
  balanceAfter:  number;
  referenceType: string | null;
  referenceId:   string | null;
  description:   string | null;
  createdAt:     string;
}

export const enterpriseService = {
  async listUsers(page = 1, limit = 50): Promise<Paginated<EnterpriseUser>> {
    const { data } = await api.get<Paginated<EnterpriseUser>>(
      "/enterprise/users",
      { params: { page, limit } },
    );
    return data;
  },

  async createUser(payload: CreateEnterpriseUserPayload): Promise<EnterpriseUser> {
    const { data } = await api.post<EnterpriseUser>(
      "/enterprise/users",
      payload,
    );
    return data;
  },

  async getOverview(): Promise<EnterpriseOverview> {
    const { data } = await api.get<EnterpriseOverview>("/enterprise/overview");
    return data;
  },

  async getLedger(
    page = 1,
    limit = 50,
  ): Promise<Paginated<EnterpriseLedgerEntry>> {
    const { data } = await api.get<Paginated<EnterpriseLedgerEntry>>(
      "/enterprise/credits/ledger",
      { params: { page, limit } },
    );
    return data;
  },

  async addExistingUser(email: string): Promise<EnterpriseUser> {
    const { data } = await api.post<EnterpriseUser>(
      "/enterprise/users/add-existing",
      { email },
    );
    return data;
  },

  async removeUser(userId: string): Promise<void> {
    await api.delete(`/enterprise/users/${userId}`);
  },
};
