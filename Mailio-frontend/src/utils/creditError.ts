import type { ApiError } from "@/src/types/auth";
import { roleFlagsFor } from "@/src/hooks/useRole";
import type { UserProfile } from "@/src/types/user";

/**
 * Backend returns HTTP 402 (Payment Required) with body
 *   `{ error: 'Insufficient Credits', message, required, available }`
 * whenever a verification can't proceed due to credits.
 *
 * Return a role-aware user-facing string. Returns `null` if the error is
 * not a credit error (caller falls back to the generic message).
 */
export function getCreditErrorMessage(
  err: unknown,
  user: UserProfile | null,
): string | null {
  const apiErr = err as ApiError | undefined;
  if (!apiErr || apiErr.status !== 402) return null;

  const flags = roleFlagsFor(user);
  if (flags.isEnterpriseMember) {
    return "Insufficient enterprise credits. Please contact your Enterprise Admin or Super Admin to top up.";
  }
  return "Insufficient credits. Please contact support — online purchase is coming soon.";
}

/** Type guard for callers that want to branch on credit errors specifically. */
export function isInsufficientCreditsError(err: unknown): boolean {
  return (err as ApiError | undefined)?.status === 402;
}
