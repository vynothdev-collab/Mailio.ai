"use client";

// Tracks recently-verified emails across the single-verify view.
// State lives in memory + sessionStorage so it survives soft route changes
// but doesn't accumulate forever across days.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RecentVerification, VerificationResult } from "@/src/features/single-verify/types";

const STORAGE_KEY = "mailio.recentSingleVerifications";
const MAX_RECORDS = 20;

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
  // Risk derived from final status when the API doesn't surface one.
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
  const [recent, setRecent] = useState<RecentVerification[]>([]);

  // Hydrate from sessionStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setRecent(JSON.parse(raw) as RecentVerification[]);
    } catch {
      // Corrupt cache — ignore and start fresh.
    }
  }, []);

  const persist = useCallback((next: RecentVerification[]) => {
    setRecent(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const push = useCallback(
    (result: VerificationResult) => {
      const record = toRecent(result);
      setRecent((prev) => {
        // De-dupe by id so re-verifying the same email replaces the row.
        const filtered = prev.filter((r) => r.id !== record.id);
        const next = [record, ...filtered].slice(0, MAX_RECORDS);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    [],
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
