"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  enterpriseService,
  type CreateEnterpriseUserPayload,
  type EnterpriseUser,
} from "@/src/services/enterpriseService";
import type { ApiError } from "@/src/types/auth";

interface CreateEnterpriseUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (user: EnterpriseUser) => void;
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validate(payload: CreateEnterpriseUserPayload): FieldErrors {
  const errors: FieldErrors = {};
  if (!payload.name || payload.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }
  if (!/.+@.+\..+/.test(payload.email)) {
    errors.email = "Enter a valid email.";
  }
  if (!payload.password || payload.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  return errors;
}

export function CreateEnterpriseUserDialog({
  open,
  onClose,
  onCreated,
}: CreateEnterpriseUserDialogProps) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setErrors({});
    setServerError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const payload = { name: name.trim(), email: email.trim().toLowerCase(), password };
    const fieldErrors = validate(payload);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await enterpriseService.createUser(payload);
      reset();
      onCreated(created);
    } catch (e) {
      const apiErr = e as ApiError;
      setServerError(apiErr?.message ?? "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={handleClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Add Enterprise User</h2>
        <p className="mt-1 text-sm text-gray-600">
          The new user will join your enterprise and share its credit balance.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={submitting}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={submitting}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Temporary Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={submitting}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Share this securely; the user can change it after first sign-in.
              </p>
            )}
          </div>

          {serverError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
