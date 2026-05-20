"use client";

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
  push:      (result: VerificationResult) => void;
  clear:     () => void;
}

const VerificationContext = createContext<VerificationContextValue | null>(null);

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
