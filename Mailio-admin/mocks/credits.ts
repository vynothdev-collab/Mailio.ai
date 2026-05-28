// TODO: Replace with real API data once backend is wired up

export interface MockCreditTransaction {
  id: string;
  date: string;
  userName: string;
  userEmail: string;
  type: "Added" | "Used" | "Refunded";
  credits: number;
  balance: number;
  description: string;
  method: "Manual" | "System" | "Plan Renewal";
}

export const MOCK_CREDIT_TRANSACTIONS: MockCreditTransaction[] = [
  { id: "T-1", date: "2025-05-26 10:30 AM", userName: "John Doe", userEmail: "john.doe@example.com", type: "Added", credits: 1200, balance: 21600, description: "Credits added by admin", method: "Manual" },
  { id: "T-2", date: "2025-05-26 09:40 AM", userName: "Sarah Johnson", userEmail: "sarah.j@example.com", type: "Used", credits: -850, balance: 2750, description: "Email verification", method: "System" },
  { id: "T-3", date: "2025-05-25 04:15 PM", userName: "Michael Smith", userEmail: "michael.smith@example.com", type: "Used", credits: -1400, balance: 4400, description: "Credits applied to plan", method: "System" },
  { id: "T-4", date: "2025-05-25 11:20 AM", userName: "Acme Corporation", userEmail: "acme.corp@example.com", type: "Added", credits: 10000, balance: 125000, description: "Credits added by admin", method: "Manual" },
  { id: "T-5", date: "2025-05-25 09:05 AM", userName: "Emily Davis", userEmail: "emily.davis@example.com", type: "Used", credits: -400, balance: 1150, description: "Email verification", method: "System" },
];

export interface MockAssignment {
  id: string;
  userName: string;
  userEmail: string;
  credits: number;
  assignedAt: string;
}

export const MOCK_RECENT_ASSIGNMENTS: MockAssignment[] = [
  { id: "A-1", userName: "John Doe", userEmail: "john.doe@example.com", credits: 1200, assignedAt: "2025-05-26 10:30 AM" },
  { id: "A-2", userName: "Acme Corporation", userEmail: "acme.corp@example.com", credits: 10000, assignedAt: "2025-05-25 11:20 AM" },
  { id: "A-3", userName: "Michael Smith", userEmail: "michael.smith@example.com", credits: 5000, assignedAt: "2025-05-24 03:45 PM" },
  { id: "A-4", userName: "Globex Solutions", userEmail: "globex.solutions@example.com", credits: 20000, assignedAt: "2025-05-24 10:15 AM" },
  { id: "A-5", userName: "Sarah Johnson", userEmail: "sarah.j@example.com", credits: 850, assignedAt: "2025-05-23 02:20 PM" },
];

export const MOCK_USAGE_TREND = [
  { date: "Apr 27", value: 50000 },
  { date: "May 1", value: 75000 },
  { date: "May 5", value: 110000 },
  { date: "May 9", value: 140000 },
  { date: "May 13", value: 180000 },
  { date: "May 17", value: 200000 },
  { date: "May 21", value: 230000 },
  { date: "May 25", value: 250000 },
];
