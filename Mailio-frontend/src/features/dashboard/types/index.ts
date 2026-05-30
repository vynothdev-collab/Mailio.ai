export type VerificationStatus = "processing" | "completed" | "failed" | "queued";

export interface StatItem {
  id: string;
  label: string;
  value: string;
  change: number;        
  changePeriod: string;
  iconName: string;      
  iconColor: string;     
  iconBgColor: string;   
}

export interface ActiveVerification {
  fileName: string;
  progress: number;       
  processedCount: number;
  totalCount: number;
  etaSeconds: number;
  startedAt: string;
  valid: number;
  invalid: number;
  catchall: number;
  disposable: number;
}

export interface VerificationRecord {
  id: string;
  fileName: string;
  totalEmails: number;
  status: VerificationStatus;
  valid: number | null;
  invalid: number | null;
  catchall: number | null;
  disposable: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  percentage: string;
  color: string;
}

export interface DashboardData {
  stats: StatItem[];
  activeVerification: ActiveVerification | null;
  recentVerifications: VerificationRecord[];
  chartData: ChartDataPoint[];
  chartTotal: number;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
}

export interface UsageInfo {
  used: number;
  total: number;
  plan: string;
}
