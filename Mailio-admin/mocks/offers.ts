// TODO: Replace with real API data once backend is wired up

export interface MockOffer {
  id: string;
  name: string;
  code: string;
  type: "Percentage" | "Fixed";
  discount: string;
  appliesTo: string;
  startDate: string;
  endDate: string;
  used: number;
  limit: number;
  status: "Active" | "Scheduled" | "Expired" | "Disabled";
}

export const MOCK_OFFERS: MockOffer[] = [
  { id: "O-1", name: "SUMMER25", code: "SUMMER25", type: "Percentage", discount: "25% OFF", appliesTo: "All Plans", startDate: "2025-05-10", endDate: "2025-05-31", used: 245, limit: 500, status: "Active" },
  { id: "O-2", name: "WELCOME10", code: "WELCOME10", type: "Percentage", discount: "10% OFF", appliesTo: "Free → Pro", startDate: "2025-05-01", endDate: "2025-05-31", used: 607, limit: 2000, status: "Active" },
  { id: "O-3", name: "FLAT500", code: "FLAT500", type: "Fixed", discount: "₹500 OFF", appliesTo: "Pro, Business", startDate: "2025-05-01", endDate: "2025-05-25", used: 92, limit: 500, status: "Active" },
  { id: "O-4", name: "NEWUSER15", code: "NEWUSER15", type: "Percentage", discount: "15% OFF", appliesTo: "First Time Users", startDate: "2025-05-01", endDate: "2025-05-31", used: 1458, limit: 3000, status: "Active" },
  { id: "O-5", name: "LOYAL20", code: "LOYAL20", type: "Percentage", discount: "20% OFF", appliesTo: "Existing Users", startDate: "2025-05-15", endDate: "2025-06-15", used: 176, limit: 1000, status: "Active" },
  { id: "O-6", name: "PROLAUNCH", code: "PROLAUNCH", type: "Fixed", discount: "₹1,000 OFF", appliesTo: "Pro + Plans", startDate: "2025-06-01", endDate: "2025-06-30", used: 0, limit: 1000, status: "Scheduled" },
  { id: "O-7", name: "WINBACK30", code: "WINBACK30", type: "Percentage", discount: "30% OFF", appliesTo: "Inactive Users", startDate: "2025-06-05", endDate: "2025-06-20", used: 0, limit: 500, status: "Scheduled" },
  { id: "O-8", name: "OLDUSER25", code: "OLDUSER25", type: "Percentage", discount: "25% OFF", appliesTo: "Inactive Users", startDate: "2025-04-10", endDate: "2025-04-20", used: 500, limit: 500, status: "Expired" },
];

export interface MockEnterpriseOffer {
  id: string;
  name: string;
  appliesTo: string;
  discount: string;
  minSeats: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Scheduled" | "Disabled";
}

export const MOCK_ENTERPRISE_OFFERS: MockEnterpriseOffer[] = [
  { id: "EO-1", name: "Growth Partner Program", appliesTo: "All Enterprises", discount: "20% OFF", minSeats: "Min 50 seats", startDate: "2025-05-01", endDate: "2025-12-31", status: "Active" },
  { id: "EO-2", name: "Annual Commitment Discount", appliesTo: "All Enterprises", discount: "15% OFF", minSeats: "Annual Plan", startDate: "2025-01-01", endDate: "2025-12-31", status: "Active" },
  { id: "EO-3", name: "Startup Booster", appliesTo: "Startups", discount: "30% OFF", minSeats: "Max 25 seats", startDate: "2025-05-01", endDate: "2025-11-30", status: "Active" },
];
