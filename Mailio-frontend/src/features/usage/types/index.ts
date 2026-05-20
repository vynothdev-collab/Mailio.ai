export type UsageEventType = "single" | "bulk";

export interface PlanQuota {
  plan:        string;
  used:        number;
  total:       number;
  resetDate:   string;
}

export interface DailyUsage {
  date:    string;   
  single:  number;
  bulk:    number;
}

export interface UsageLogEntry {
  id:         string;
  type:       UsageEventType;
  label:      string;   
  credits:    number;
  occurredAt: string;
}
