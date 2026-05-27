export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  sessionToken: string;
  user: AdminUser;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// Dashboard types
export interface DashboardOverview {
  users: {
    total: number;
    active: number;
    todaySignups: number;
    byPlan: { PRO: number; ULTIMATE: number };
  };
  verifications: {
    total: number;
    valid: number;
    invalid: number;
    risky: number;
    validRate: number;
    invalidRate: number;
    riskyRate: number;
  };
  dailyTrend: Array<{
    date: string;
    total: number;
    valid: number;
    invalid: number;
    risky: number;
  }>;
  recentUsers: UserRow[];
}

// User management types
export interface UserRow {
  id: string;
  name: string;
  email: string;
  plan: string;
  isActive: boolean;
  emailVerified: boolean;
  provider: string;
  createdAt: string;
}

export interface UserDetail extends UserRow {
  emailVerifiedAt: string | null;
  avatarUrl: string | null;
  updatedAt: string;
  verificationStats: {
    total: number;
    valid: number;
    invalid: number;
    risky: number;
  };
}

// Activity log types
export interface ActivityLog {
  id: string;
  type: string;
  module: string;
  action: string;
  targetId: string | null;
  targetName: string | null;
  changedByAdminId: string;
  changedByAdminName: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}
