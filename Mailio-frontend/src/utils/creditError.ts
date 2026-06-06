import type { ApiError } from "@/src/types/auth";
import { roleFlagsFor } from "@/src/hooks/useRole";
import type { UserProfile } from "@/src/types/user";

export function getCreditErrorMessage(err: unknown, user: UserProfile | null): string | null {
  const apiErr = err as ApiError | undefined;
  if (!apiErr || apiErr.status !== 402) return null;

  const flags = roleFlagsFor(user);
  if (flags.isEnterpriseMember) {
    return "Insufficient enterprise credits. Please contact your Enterprise Admin or Super Admin to top up.";
  }
  return "Insufficient credits. Please contact support — online purchase is coming soon.";
}

export function isInsufficientCreditsError(err: unknown): boolean {
  return (err as ApiError | undefined)?.status === 402;
}
