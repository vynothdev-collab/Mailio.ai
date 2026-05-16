import type { CurrentPlan, PaymentMethod, SavedPaymentMethod, Invoice } from "../types";

export const MOCK_CURRENT_PLAN: CurrentPlan = {
  name:            "Pro Plan",
  monthlyPrice:    49,
  annualPrice:     39,
  cycle:           "monthly",
  nextBillingDate: "Jun 1, 2026",
  features: [
    "10,000 verifications / month",
    "Bulk verification (CSV & TXT)",
    "CSV / Excel / JSON exports",
    "Priority support",
  ],
};

export const MOCK_PAYMENT_METHOD: PaymentMethod = {
  brand:    "visa",
  last4:    "4242",
  expMonth: 8,
  expYear:  2027,
};

export const MOCK_SAVED_METHODS: SavedPaymentMethod[] = [
  { id: "1", type: "card",   isDefault: true,  brand: "visa",       last4: "4242", expMonth: 8, expYear: 2027 },
  { id: "2", type: "card",   isDefault: false, brand: "mastercard", last4: "1234", expMonth: 3, expYear: 2026 },
  { id: "3", type: "paypal", isDefault: false, email: "user@example.com" },
];

export const MOCK_INVOICES: Invoice[] = [
  { id:  "1", label: "Pro Plan — May 2026",  date: "May 1, 2026",  amount: 49, status: "paid"    },
  { id:  "2", label: "Pro Plan — Apr 2026",  date: "Apr 1, 2026",  amount: 49, status: "paid"    },
  { id:  "3", label: "Pro Plan — Mar 2026",  date: "Mar 1, 2026",  amount: 49, status: "paid"    },
  { id:  "4", label: "Pro Plan — Feb 2026",  date: "Feb 1, 2026",  amount: 49, status: "failed"  },
  { id:  "5", label: "Pro Plan — Feb 2026",  date: "Feb 3, 2026",  amount: 49, status: "paid"    },
  { id:  "6", label: "Pro Plan — Jan 2026",  date: "Jan 1, 2026",  amount: 49, status: "paid"    },
  { id:  "7", label: "Pro Plan — Dec 2025",  date: "Dec 1, 2025",  amount: 49, status: "paid"    },
  { id:  "8", label: "Starter — Nov 2025",   date: "Nov 1, 2025",  amount: 19, status: "paid"    },
  { id:  "9", label: "Starter — Oct 2025",   date: "Oct 1, 2025",  amount: 19, status: "paid"    },
  { id: "10", label: "Starter — Sep 2025",   date: "Sep 1, 2025",  amount: 19, status: "paid"    },
];
