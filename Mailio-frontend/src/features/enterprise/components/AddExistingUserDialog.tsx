"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enterpriseService, type EnterpriseUser } from "@/src/services/enterpriseService";
import type { ApiError } from "@/src/types/auth";

interface Props {
  open:      boolean;
  onClose:   () => void;
  onAdded:   (user: EnterpriseUser) => void;
}

export function AddExistingUserDialog({ open, onClose, onAdded }: Props) {
  const [email,       setEmail]       = useState("");
  const [error,       setError]       = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  function reset() {
    setEmail("");
    setError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const user = await enterpriseService.addExistingUser(email.trim());
      reset();
      onAdded(user);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to add user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Existing User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="existing-email" className="text-sm font-medium">User Email</label>
            <Input
              id="existing-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The user must already have an account on this platform.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add to Enterprise"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
