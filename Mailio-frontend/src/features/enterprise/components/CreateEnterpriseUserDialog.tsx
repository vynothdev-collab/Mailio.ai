"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  enterpriseService,
  type CreateEnterpriseUserPayload,
  type EnterpriseUser,
} from "@/src/services/enterpriseService";
import type { ApiError } from "@/src/types/auth";

interface CreateEnterpriseUserDialogProps {
  open:             boolean;
  onClose:          () => void;
  onCreated:        (user: EnterpriseUser) => void;
  availableCredits: number;
}

interface FieldErrors {
  name?:             string;
  email?:            string;
  password?:         string;
  creditAllocation?: string;
}

function validate(payload: CreateEnterpriseUserPayload, available: number): FieldErrors {
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
  if (payload.creditAllocation !== undefined) {
    if (payload.creditAllocation < 1) {
      errors.creditAllocation = "Allocation must be at least 1.";
    } else if (payload.creditAllocation > available) {
      errors.creditAllocation = `Only ${available.toLocaleString()} credits available to allocate.`;
    }
  }
  return errors;
}

export function CreateEnterpriseUserDialog({
  open,
  onClose,
  onCreated,
  availableCredits,
}: CreateEnterpriseUserDialogProps) {
  const [name,             setName]             = useState("");
  const [email,            setEmail]            = useState("");
  const [password,         setPassword]         = useState("");
  const [creditAllocation, setCreditAllocation] = useState("");
  const [errors,           setErrors]           = useState<FieldErrors>({});
  const [submitting,       setSubmitting]       = useState(false);
  const [serverError,      setServerError]      = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setName(""); setEmail(""); setPassword(""); setCreditAllocation("");
    setErrors({}); setServerError(null);
  };

  const handleClose = () => { if (submitting) return; reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

    const alloc = creditAllocation.trim() ? parseInt(creditAllocation, 10) : undefined;
    const payload: CreateEnterpriseUserPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      ...(alloc !== undefined && { creditAllocation: alloc }),
    };

    const fieldErrors = validate(payload, availableCredits);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await enterpriseService.createUser(payload);
      reset();
      onCreated(created);
    } catch (e) {
      setServerError((e as ApiError)?.message ?? "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={handleClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Enterprise User</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              The new user will join your enterprise and can use allocated credits.
            </p>
          </div>
          <button type="button" onClick={handleClose} className="p-1 rounded hover:bg-gray-100 ml-3 shrink-0">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-gray-700">Temporary Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Share this securely; the user can change it after first sign-in.</p>
            )}
          </div>

          {/* Credit Allocation */}
          <div className="border-t border-gray-100 pt-4">
            <label className="text-sm font-medium text-gray-700">
              Credit Allocation{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="number"
              value={creditAllocation}
              onChange={(e) => setCreditAllocation(e.target.value)}
              min={1}
              max={availableCredits}
              disabled={submitting || availableCredits === 0}
              placeholder={availableCredits > 0 ? `Up to ${availableCredits.toLocaleString()}` : "No credits available"}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {errors.creditAllocation ? (
              <p className="mt-1 text-xs text-red-600">{errors.creditAllocation}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                {availableCredits > 0
                  ? `${availableCredits.toLocaleString()} credits available in the enterprise pool.`
                  : "No credits available — purchase a plan first."}
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Adding…" : "Add User"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
