"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const CONFIRM_PHRASE = "delete my account";

export function DangerZoneCard() {
  const [value, setValue] = useState("");
  const confirmed = value.trim().toLowerCase() === CONFIRM_PHRASE;

  function handleDelete() {
    if (!confirmed) return;
    toast.error("Account deletion requested. You will receive a confirmation email.");
    setValue("");
  }

  return (
    <Card className="border-red-200">
      <CardContent className="pt-3 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
            <TriangleAlert size={14} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-red-600">Danger Zone</h2>
            <p className="text-xs text-muted-foreground">These actions are irreversible.</p>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">Delete Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete your account and all associated data — verifications, API keys, and billing history. This cannot be undone.
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Type <span className="font-mono font-semibold text-foreground">{CONFIRM_PHRASE}</span> to confirm
            </label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="h-9 text-sm border-red-200 focus-visible:ring-red-300"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={!confirmed}
            onClick={handleDelete}
            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 disabled:opacity-40 text-xs"
          >
            Delete My Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
