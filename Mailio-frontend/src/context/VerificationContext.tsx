"use client";

// Tracks recently-verified emails across the single-verify view.
// State lives in memory + sessionStorage (per-tab) so it survives soft route
// changes but is scoped to a single browser tab and a single signed-in user.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/src/hooks/useAuth";
import type { RecentVerification, VerificationResult } from "@/src/features/single-verify/types";

const STORAGE_KEY_PREFIX = "mailio.recentSingleVerifications";
const MAX_RECORDS = 20;

const storageKeyFor = (userId: string | null) =>
  userId ? `${STORAGE_KEY_PREFIX}::${userId}` : null;

interface VerificationContextValue {
  recent:    RecentVerification[];
  /** Add a verification result to the head of the list. */
  push:      (result: VerificationResult) => void;
  /** Wipe local history (used when switching accounts, etc.). */
  clear:     () => void;
}

const VerificationContext = createContext<VerificationContextValue | null>(null);

/** Map a VerificationResult → the compact row shape used by the table. */
function toRecent(result: VerificationResult): RecentVerification {
  const risk: RecentVerification["risk"] =
    result.status === "valid"     ? "low"
  : result.status === "risky"     ||
    result.status === "unknown"   ? "medium"
                                  : "high";

  return {
    id:         result.id ?? `${result.email}-${result.verifiedAt}`,
    email:      result.email,
    status:     result.status,
    risk,
    verifiedAt: result.verifiedAt,
  };
}

export function VerificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [recent, setRecent] = useState<RecentVerification[]>([]);

  // Re-hydrate when the signed-in user changes — never leak one user's
  // history into another user's view inside the same tab.
  useEffect(() => {
    const key = storageKeyFor(userId);
    if (typeof window === "undefined" || !key) {
      setRecent([]);
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(key);
      setRecent(raw ? (JSON.parse(raw) as RecentVerification[]) : []);
    } catch {
      setRecent([]);
    }
  }, [userId]);

  const persist = useCallback(
    (next: RecentVerification[]) => {
      setRecent(next);
      const key = storageKeyFor(userId);
      if (typeof window !== "undefined" && key) {
        window.sessionStorage.setItem(key, JSON.stringify(next));
      }
    },
    [userId],
  );

  const push = useCallback(
    (result: VerificationResult) => {
      const record = toRecent(result);
      setRecent((prev) => {
        // De-dupe by id so re-verifying the same email replaces the row.
        const filtered = prev.filter((r) => r.id !== record.id);
        const next = [record, ...filtered].slice(0, MAX_RECORDS);
        const key = storageKeyFor(userId);
        if (typeof window !== "undefined" && key) {
          window.sessionStorage.setItem(key, JSON.stringify(next));
        }
        return next;
      });
    },
    [userId],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo<VerificationContextValue>(
    () => ({ recent, push, clear }),
    [recent, push, clear],
  );

  return <VerificationContext.Provider value={value}>{children}</VerificationContext.Provider>;
}

export function useVerificationHistory(): VerificationContextValue {
  const ctx = useContext(VerificationContext);
  if (!ctx) throw new Error("useVerificationHistory must be used inside <VerificationProvider>");
  return ctx;
}
