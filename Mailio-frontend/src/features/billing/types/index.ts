export type BillingCycle    = "monthly" | "annual";
export type InvoiceStatus   = "paid" | "failed" | "pending";
export type CardBrand       = "visa" | "mastercard" | "amex" | "other";
export type PaymentType     = "card" | "paypal" | "apple_pay" | "google_pay";

export interface CurrentPlan {
  name:            string;
  monthlyPrice:    number;
  annualPrice:     number;
  cycle:           BillingCycle;
  nextBillingDate: string;
  features:        string[];
}

export interface SavedPaymentMethod {
  id:        string;
  type:      PaymentType;
  isDefault: boolean;
  brand?:    CardBrand;
  last4?:    string;
  expMonth?: number;
  expYear?:  number;
  email?:    string;
}

export interface PaymentMethod {
  brand:    CardBrand;
  last4:    string;
  expMonth: number;
  expYear:  number;
}

export interface Invoice {
  id:       string;
  label:    string;
  date:     string;
  amount:   number;
  status:   InvoiceStatus;
}
