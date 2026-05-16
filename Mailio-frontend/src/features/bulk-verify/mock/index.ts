import type { BulkActiveJob, BulkVerificationRecord, BulkStat } from "../types";

export const MOCK_ACTIVE_JOB: BulkActiveJob = {
  fileName:       "Spring Outreach List.csv",
  uploadedAt:     "May 7, 2026, 10:24 AM",
  progress:       72,
  processedCount: 7_126,
  totalCount:     10_000,
  etaSeconds:     138,
  startedAt:      "Today, 10:24 AM",
  valid:          6_238,
  invalid:        512,
  risky:          276,
  disposable:     100,
};

export const MOCK_BULK_STATS: BulkStat[] = [
  { id: "files-today",   label: "Files Verified Today",        value: "6",       subLabel: "+2 vs yesterday",         change:  2,    iconName: "FolderOpen", iconColor: "text-blue-600",   iconBgColor: "bg-blue-50"   },
  { id: "current-job",   label: "Total Emails in Current Job", value: "10,000",  subLabel: "Including 320 duplicates", change:  0,    iconName: "Mail",       iconColor: "text-blue-600",   iconBgColor: "bg-blue-50"   },
  { id: "completed",     label: "Completed Jobs",              value: "18",      subLabel: "+4 vs yesterday",         change:  4,    iconName: "CheckCircle2", iconColor: "text-emerald-600", iconBgColor: "bg-emerald-50"},
  { id: "response-time", label: "Avg. Response Time",          value: "1.4s",    subLabel: "-0.3s vs yesterday",      change: -0.3,  iconName: "Clock",      iconColor: "text-amber-600",  iconBgColor: "bg-amber-50"  },
];

export const MOCK_RECENT_JOBS: BulkVerificationRecord[] = [
  { id: "1", fileName: "Spring Outreach List.csv",    totalEmails: 10_000, status: "processing", valid: 6_238, invalid: 512, risky: 276, disposable: 100 },
  { id: "2", fileName: "CMO Leads May.csv",           totalEmails: 5_000,  status: "completed",  valid: 4_642, invalid: 198, risky: 128, disposable:  32 },
  { id: "3", fileName: "Newsletter Signups.csv",      totalEmails: 2_480,  status: "completed",  valid: 2_157, invalid: 167, risky:  96, disposable:  60 },
  { id: "4", fileName: "Old Leads Cleanup.csv",       totalEmails: 8_120,  status: "failed",     valid: null,  invalid: null, risky: null, disposable: null },
  { id: "5", fileName: "Webinar Registrations.txt",   totalEmails: 3_210,  status: "completed",  valid: 2_812, invalid: 145, risky:  88, disposable:  45 },
];

export const MOCK_CHART_DATA = [
  { name: "Valid",      value: 6_238, percentage: "68.3%", color: "#10b981" },
  { name: "Invalid",    value: 877,   percentage: "9.6%",  color: "#ef4444" },
  { name: "Risky",      value: 1_711, percentage: "18.7%", color: "#f59e0b" },
  { name: "Disposable", value: 300,   percentage: "3.3%",  color: "#8b5cf6" },
];
export const MOCK_CHART_TOTAL = 9_126;
