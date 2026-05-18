export interface Plan {
  id:           string;
  name:         string;
  monthlyPrice: number | null;   
  annualPrice:  number | null;
  description:  string;
  features:     string[];
  highlighted:  boolean;         
}

export const PLANS: Plan[] = [
  {
    id:           "starter",
    name:         "Starter",
    monthlyPrice: 19,
    annualPrice:  15,
    description:  "Great for individuals and small teams.",
    highlighted:  false,
    features: [
      "2,000 verifications / month",
      "Single verification",
      "CSV export",
      "Email support",
    ],
  },
  {
    id:           "pro",
    name:         "Pro",
    monthlyPrice: 49,
    annualPrice:  39,
    description:  "For growing teams with bulk needs.",
    highlighted:  true,
    features: [
      "10,000 verifications / month",
      "Bulk verification (CSV & TXT)",
      "CSV / Excel / JSON exports",
      "Priority support",
    ],
  },
  {
    id:           "enterprise",
    name:         "Enterprise",
    monthlyPrice: null,
    annualPrice:  null,
    description:  "Custom volume and SLA for large orgs.",
    highlighted:  false,
    features: [
      "Unlimited verifications",
      "Dedicated infrastructure",
      "Custom integrations",
      "SLA guarantee",
      "Dedicated account manager",
    ],
  },
];
