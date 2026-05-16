"use client";

import { useState } from "react";
import {
  CreditCard, Trash2, Star, Plus, X,
  CheckCircle2, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";
import { MOCK_SAVED_METHODS } from "../mock";
import type { SavedPaymentMethod, CardBrand, PaymentType } from "../types";

// ── Brand helpers ──────────────────────────────────────────────────────────

const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa", mastercard: "Mastercard", amex: "Amex", other: "Card",
};

const BRAND_COLOR: Record<CardBrand, string> = {
  visa: "text-blue-600", mastercard: "text-red-500",
  amex: "text-sky-600",  other: "text-muted-foreground",
};

// ── Add method tiles ───────────────────────────────────────────────────────

interface AddTile {
  type:     PaymentType;
  label:    string;
  sub:      string;
  icon:     React.ReactNode;
  available: boolean;
}

const ADD_TILES: AddTile[] = [
  {
    type: "card",
    label: "Credit / Debit Card",
    sub: "Visa, Mastercard, Amex",
    icon: <CreditCard size={20} className="text-primary" />,
    available: true,
  },
  {
    type: "paypal",
    label: "PayPal",
    sub: "Pay with your PayPal account",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#003087]" aria-hidden>
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.825l-1.43 9.043h3.507c.524 0 .968-.382 1.05-.9l.892-5.656c.082-.518.526-.9 1.05-.9h.666c4.298 0 7.664-1.747 8.647-6.797.348-1.786.133-3.16-.985-4.585z"/>
      </svg>
    ),
    available: true,
  },
  {
    type: "apple_pay",
    label: "Apple Pay",
    sub: "Available on Safari / iOS",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden>
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
      </svg>
    ),
    available: false,
  },
  {
    type: "google_pay",
    label: "Google Pay",
    sub: "Available on Chrome / Android",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    available: false,
  },
];

// ── Card form ──────────────────────────────────────────────────────────────

function formatCardNumber(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  return digits;
}

interface CardFormProps { onCancel: () => void; onSave: () => void; }

function CardForm({ onCancel, onSave }: CardFormProps) {
  const [number, setNumber]   = useState("");
  const [expiry, setExpiry]   = useState("");
  const [cvc,    setCvc]      = useState("");
  const [name,   setName]     = useState("");

  const isValid = number.replace(/\s/g, "").length === 16
    && expiry.replace(/\s\/\s/, "").length === 4
    && cvc.length >= 3
    && name.trim().length > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Add Card</p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Cardholder Name</label>
          <Input
            placeholder="Name on card"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Card Number</label>
          <Input
            placeholder="1234 5678 9012 3456"
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
            className="h-9 text-sm font-mono tracking-wider"
            maxLength={19}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Expiry</label>
            <Input
              placeholder="MM / YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              className="h-9 text-sm font-mono"
              maxLength={7}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">CVC</label>
            <Input
              placeholder="123"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-9 text-sm font-mono"
              maxLength={4}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="text-xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!isValid}
          className="flex-1 gradient-brand border-0 text-white hover:opacity-90 text-xs disabled:opacity-40"
          onClick={onSave}
        >
          Save Card
        </Button>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

interface Props { open: boolean; onClose: () => void; }

export function PaymentMethodsModal({ open, onClose }: Props) {
  const [methods,     setMethods]     = useState<SavedPaymentMethod[]>(MOCK_SAVED_METHODS);
  const [addingType,  setAddingType]  = useState<PaymentType | null>(null);

  function handleSetDefault(id: string) {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    toast.success("Default payment method updated.");
  }

  function handleRemove(id: string) {
    setMethods((prev) => prev.filter((m) => m.id !== id));
    toast.success("Payment method removed.");
  }

  function handleSaveCard() {
    const newMethod: SavedPaymentMethod = {
      id:        String(Date.now()),
      type:      "card",
      isDefault: false,
      brand:     "visa",
      last4:     "0000",
      expMonth:  12,
      expYear:   2028,
    };
    setMethods((prev) => [...prev, newMethod]);
    setAddingType(null);
    toast.success("Card added successfully.");
  }

  function handlePayPal() {
    setAddingType(null);
    toast.info("Redirecting to PayPal…");
  }

  function methodLabel(m: SavedPaymentMethod) {
    if (m.type === "card") {
      const brand = BRAND_LABEL[m.brand ?? "other"];
      return `${brand} •••• ${m.last4}`;
    }
    if (m.type === "paypal") return `PayPal — ${m.email}`;
    return m.type;
  }

  function methodSub(m: SavedPaymentMethod) {
    if (m.type === "card")
      return `Expires ${String(m.expMonth).padStart(2, "0")} / ${m.expYear}`;
    return "PayPal account";
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md! w-full" showCloseButton>
        <DialogHeader>
          <DialogTitle>Payment Methods</DialogTitle>
          <DialogDescription>
            Manage your saved payment methods and add new ones.
          </DialogDescription>
        </DialogHeader>

        {/* Saved methods */}
        {methods.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Saved Methods
            </p>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-3 bg-card hover:bg-muted/20 transition-colors">
                  {/* Icon */}
                  <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                    {m.type === "card"
                      ? <CreditCard size={16} className={BRAND_COLOR[m.brand ?? "other"]} />
                      : <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#003087]" aria-hidden>
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.825l-1.43 9.043h3.507c.524 0 .968-.382 1.05-.9l.892-5.656c.082-.518.526-.9 1.05-.9h.666c4.298 0 7.664-1.747 8.647-6.797.348-1.786.133-3.16-.985-4.585z"/>
                        </svg>
                    }
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{methodLabel(m)}</p>
                    <p className="text-xs text-muted-foreground">{methodSub(m)}</p>
                  </div>

                  {/* Default badge / actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {m.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 size={9} />
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(m.id)}
                        className="text-[11px] font-medium text-primary hover:underline whitespace-nowrap"
                      >
                        Set default
                      </button>
                    )}
                    {!m.isDefault && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors ml-1"
                        aria-label="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Add New Method
          </p>

          {/* Inline card form */}
          {addingType === "card" ? (
            <CardForm onCancel={() => setAddingType(null)} onSave={handleSaveCard} />
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {ADD_TILES.map((tile) => (
                <button
                  key={tile.type}
                  disabled={!tile.available}
                  onClick={() => {
                    if (!tile.available) return;
                    if (tile.type === "paypal") { handlePayPal(); return; }
                    setAddingType(tile.type);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                    tile.available
                      ? "hover:bg-muted/30 cursor-pointer"
                      : "opacity-40 cursor-not-allowed"
                  )}
                >
                  <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                    {tile.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tile.label}</p>
                    <p className="text-xs text-muted-foreground">{tile.sub}</p>
                  </div>
                  {tile.available
                    ? <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                    : <span className="text-[10px] font-medium text-muted-foreground shrink-0">Soon</span>
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
