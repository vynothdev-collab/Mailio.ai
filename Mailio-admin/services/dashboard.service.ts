import { apiService } from "./api";

export type DashboardTab = "single" | "enterprise";

export interface SingleOverview {
  kpis: {
    registeredUsers: number;
    activeUsers: number;
    todaysSignups: number;
    creditsUsed: number;
    creditsRemaining: number;
    deltas: {
      registeredUsers: number;
      activeUsers: number;
      todaysSignups: number;
      creditsUsed: number;
    };
  };
  verifications: {
    total: number;
    valid: number;
    invalid: number;
    catchall: number;
    validRate: number;
    invalidRate: number;
    catchallRate: number;
    deltas: {
      total: number;
      validRate: number;
      invalidRate: number;
      catchallRate: number;
    };
  };
  credits: {
    used: number;
    remaining: number;
    total: number;
    usedPct: number;
  };
  expiryAlerts: {
    expiringIn7dCount: number;
    top: Array<{
      id: string;
      name: string;
      planName: string;
      daysRemaining: number;
    }>;
  };
  verificationTrend: Array<{
    date: string;
    total: number;
    valid: number;
    invalid: number;
  }>;
  signupTrend: Array<{ date: string; count: number }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    plan: string | null;
  }>;
}

export interface EnterpriseOverview {
  kpis: {
    totalEnterprises: number;
    activeEnterprises: number;
    enterpriseUsers: number;
    teamCreditsAssigned: number;
    expiringPlans: number;
    deltas: {
      totalEnterprises: number;
      activeEnterprises: number;
      enterpriseUsers: number;
      teamCreditsAssigned: number;
      expiringPlans: number;
    };
  };
  expiryAlerts: {
    expiringIn7dCount: number;
    top: Array<{
      id: string;
      name: string;
      domain: string;
      planName: string;
      daysRemaining: number;
    }>;
  };
  usageTrend: Array<{ date: string; verifications: number }>;
  planDistribution: Array<{ planName: string; count: number; pct: number }>;
  recentEnterprises: Array<{
    id: string;
    name: string;
    domain: string;
    planName: string;
    users: number;
    creditsUsed: number;
    creditsAssigned: number;
    status: string;
  }>;
}

export const dashboardService = {
  single: (period = "7d") =>
    apiService.get<SingleOverview>(
      `/admin/dashboard/overview?tab=single&period=${encodeURIComponent(period)}`,
    ),
  enterprise: (period = "7d") =>
    apiService.get<EnterpriseOverview>(
      `/admin/dashboard/overview?tab=enterprise&period=${encodeURIComponent(period)}`,
    ),
};
