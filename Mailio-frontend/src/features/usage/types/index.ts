export type UsageEventType = "single" | "bulk";

export interface PlanQuota {
  plan:        string;
  used:        number;
  total:       number;
  resetDate:   string;
}

export interface DailyUsage {
  date:    string;   // "May 1"
  single:  number;
  bulk:    number;
}

export interface UsageLogEntry {
  id:         string;
  type:       UsageEventType;
  label:      string;   // email for single, file name for bulk
  credits:    number;
  occurredAt: string;
}
