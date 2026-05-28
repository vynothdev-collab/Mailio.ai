// TODO: Replace with real API data once backend is wired up

export interface MockPlan {
  id: string;
  name: string;
  type: "Single User" | "Enterprise";
  price: number;
  currency: string;
  credits: number;
  validityDays: number;
  usersIncluded: number;
  billingCycle: "Monthly" | "Yearly";
  status: "Active" | "Inactive" | "Archived";
  updated: string;
  features: string[];
  starred?: boolean;
}

export const MOCK_SINGLE_PLANS: MockPlan[] = [
  {
    id: "PLAN-SU-PRO-001",
    name: "Pro Plan",
    type: "Single User",
    price: 499,
    currency: "₹",
    credits: 10000,
    validityDays: 30,
    usersIncluded: 1,
    billingCycle: "Monthly",
    status: "Active",
    updated: "2025-05-24",
    starred: true,
    features: [
      "10,000 monthly credits",
      "Email verification",
      "Advanced analytics",
      "Bulk processing (up to 10k)",
      "API access",
      "Priority email support",
      "Activity logs (30 days)",
    ],
  },
  {
    id: "PLAN-SU-BAS-001",
    name: "Basic Plan",
    type: "Single User",
    price: 199,
    currency: "₹",
    credits: 3000,
    validityDays: 30,
    usersIncluded: 1,
    billingCycle: "Monthly",
    status: "Active",
    updated: "2025-05-23",
    features: ["3,000 monthly credits", "Email verification", "Basic analytics"],
  },
  {
    id: "PLAN-SU-FREE-001",
    name: "Free Plan",
    type: "Single User",
    price: 0,
    currency: "₹",
    credits: 500,
    validityDays: 30,
    usersIncluded: 1,
    billingCycle: "Monthly",
    status: "Active",
    updated: "2025-05-20",
    features: ["500 credits/month", "Single verification only"],
  },
  {
    id: "PLAN-SU-PRO-Y",
    name: "Annual Pro",
    type: "Single User",
    price: 4990,
    currency: "₹",
    credits: 120000,
    validityDays: 365,
    usersIncluded: 1,
    billingCycle: "Yearly",
    status: "Active",
    updated: "2025-05-18",
    features: ["120,000 yearly credits", "All Pro features", "2 months free"],
  },
  {
    id: "PLAN-SU-STR-001",
    name: "Starter Plan",
    type: "Single User",
    price: 99,
    currency: "₹",
    credits: 1000,
    validityDays: 30,
    usersIncluded: 1,
    billingCycle: "Monthly",
    status: "Inactive",
    updated: "2025-05-16",
    features: ["1,000 credits", "Limited features"],
  },
];

export const MOCK_ENTERPRISE_PLANS: MockPlan[] = [
  {
    id: "PLAN-ENT-B",
    name: "Enterprise Basic",
    type: "Enterprise",
    price: 5000,
    currency: "₹",
    credits: 100000,
    validityDays: 30,
    usersIncluded: 10,
    billingCycle: "Monthly",
    status: "Active",
    updated: "2025-05-22",
    features: ["10 users", "100,000 credits/mo", "Business hours support"],
  },
  {
    id: "PLAN-ENT-P",
    name: "Enterprise Pro",
    type: "Enterprise",
    price: 19000,
    currency: "₹",
    credits: 500000,
    validityDays: 30,
    usersIncluded: 50,
    billingCycle: "Monthly",
    status: "Active",
    updated: "2025-05-21",
    features: ["50 users", "500,000 credits/mo", "Priority support", "API access"],
  },
  {
    id: "PLAN-ENT-PL",
    name: "Enterprise Plus",
    type: "Enterprise",
    price: 49000,
    currency: "₹",
    credits: 1500000,
    validityDays: 30,
    usersIncluded: 150,
    billingCycle: "Monthly",
    status: "Active",
    updated: "2025-05-20",
    features: ["150 users", "1.5M credits/mo", "24/7 dedicated support", "Custom integrations"],
  },
];
