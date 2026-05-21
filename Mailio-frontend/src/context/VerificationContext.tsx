"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/src/hooks/useAuth";
import type { RecentVerification, VerificationResult } from "@/src/features/single-verify/types";

const MAX_RECORDS = 20;

interface VerificationContextValue {
  recent:    RecentVerification[];
  push:      (result: VerificationResult) => void;
  remove:    (id: string) => void;
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
  // Reset the in-memory buffer when the signed-in user changes, without an
  // effect (React-recommended derived-state pattern). The API is the source
  // of truth — this buffer only exists for the brief moment between
  // "just verified" and the next refetch resolving.
  const [prevUserId, setPrevUserId] = useState(userId);
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setRecent([]);
  }

  const push = useCallback((result: VerificationResult) => {
    const record = toRecent(result);
    setRecent((prev) => {
      const filtered = prev.filter((r) => r.id !== record.id);
      return [record, ...filtered].slice(0, MAX_RECORDS);
    });
  }, []);

  const remove = useCallback((id: string) => {
    setRecent((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clear = useCallback(() => setRecent([]), []);

  const value = useMemo<VerificationContextValue>(
    () => ({ recent, push, remove, clear }),
    [recent, push, remove, clear],
  );

  return <VerificationContext.Provider value={value}>{children}</VerificationContext.Provider>;
}

export function useVerificationHistory(): VerificationContextValue {
  const ctx = useContext(VerificationContext);
  if (!ctx) throw new Error("useVerificationHistory must be used inside <VerificationProvider>");
  return ctx;
}
