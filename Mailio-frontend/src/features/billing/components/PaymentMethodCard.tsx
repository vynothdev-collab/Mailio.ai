"use client";

import { useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_PAYMENT_METHOD } from "../mock";
import { PaymentMethodsModal } from "./PaymentMethodsModal";

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa", mastercard: "Mastercard", amex: "Amex", other: "Card",
};

export function PaymentMethodCard() {
  const { brand, last4, expMonth, expYear } = MOCK_PAYMENT_METHOD;
  const exp = `${String(expMonth).padStart(2, "0")} / ${expYear}`;
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="pt-3 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Payment Method</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Card on file for billing</p>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex h-10 w-14 items-center justify-center rounded-md border border-border bg-background shadow-sm">
            <CreditCard size={20} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{BRAND_LABEL[brand]} •••• {last4}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Expires {exp}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ShieldCheck size={13} />
            Active
          </div>
        </div>

        <Button variant="outline" className="w-full text-sm" onClick={() => setOpen(true)}>
          Manage Payment Methods
        </Button>

        <PaymentMethodsModal open={open} onClose={() => setOpen(false)} />
      </CardContent>
    </Card>
  );
}
