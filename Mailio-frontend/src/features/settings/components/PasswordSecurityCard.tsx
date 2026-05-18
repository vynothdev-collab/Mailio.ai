"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";

function PasswordInput({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          className="h-9 text-sm pr-9"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function strengthLabel(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: "",        color: "",                    width: "w-0"   };
  if (pw.length < 6)   return { label: "Weak",    color: "bg-red-500",          width: "w-1/4" };
  if (pw.length < 10)  return { label: "Fair",    color: "bg-amber-500",        width: "w-2/4" };
  if (pw.length < 14)  return { label: "Good",    color: "bg-blue-500",         width: "w-3/4" };
  return                      { label: "Strong",  color: "bg-emerald-500",      width: "w-full" };
}

export function PasswordSecurityCard() {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [twoFA,    setTwoFA]    = useState(false);

  const strength  = strengthLabel(next);
  const mismatch  = confirm.length > 0 && next !== confirm;
  const canSave   = current.length > 0 && next.length >= 6 && next === confirm;

  function handleSave() {
    setCurrent(""); setNext(""); setConfirm("");
    toast.success("Password updated successfully.");
  }

  return (
    <Card>
      <CardContent className="pt-3 space-y-5">
        <div>
          <h2 className="text-sm font-semibold">Password & Security</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Update your password and two-factor authentication.</p>
        </div>

        <div className="space-y-3">
          <PasswordInput label="Current Password" value={current} onChange={setCurrent} />
          <PasswordInput label="New Password"     value={next}    onChange={setNext}    placeholder="Min. 6 characters" />

          {next.length > 0 && (
            <div className="space-y-1">
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-300", strength.color, strength.width)} />
              </div>
              <p className={cn("text-[11px] font-medium", strength.color.replace("bg-", "text-"))}>
                {strength.label}
              </p>
            </div>
          )}

          <PasswordInput label="Confirm New Password" value={confirm} onChange={setConfirm} />
          {mismatch && <p className="text-xs text-red-500">Passwords do not match.</p>}
        </div>

        <div className="flex justify-end">
          <Button
            disabled={!canSave}
            onClick={handleSave}
            className="gradient-brand border-0 text-white hover:opacity-90 text-sm disabled:opacity-40"
          >
            Update Password
          </Button>
        </div>

        <div className="border-t border-border" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {twoFA ? "2FA is enabled. Your account is protected." : "Add an extra layer of security to your account."}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setTwoFA((v) => !v);
              toast.success(twoFA ? "2FA disabled." : "2FA enabled successfully.");
            }}
            role="switch"
            aria-checked={twoFA}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
              twoFA ? "bg-primary" : "bg-muted"
            )}
          >
            <span className={cn(
              "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
              twoFA ? "translate-x-4" : "translate-x-0"
            )} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
