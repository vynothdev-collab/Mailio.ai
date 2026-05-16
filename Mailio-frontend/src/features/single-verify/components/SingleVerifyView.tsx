"use client";

import { useState } from "react";
import { VerificationProvider, useVerificationHistory } from "@/src/context/VerificationContext";
import { useSingleVerify } from "../hooks/useSingleVerify";
import { EmailInputCard }                  from "./EmailInputCard";
import { VerificationResultCard }          from "./VerificationResultCard";
import { ResultBreakdownCard }             from "./ResultBreakdownCard";
import { VerificationSummaryCard }         from "./VerificationSummaryCard";
import { RecentSingleVerificationsTable }  from "./RecentSingleVerificationsTable";
import { ProTipCard }                      from "./ProTipCard";

function SingleVerifyContent() {
  const { state, result, verify } = useSingleVerify();
  const { recent }                = useVerificationHistory();
  const [refreshKey, setRefreshKey] = useState(0);
  const isLoading = state === "loading";

  const handleVerify = async (email: string) => {
    await verify(email);
    // Bump so the table + summary refetch from the server.
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* ── Left / main column ── */}
      <div className="lg:col-span-2 space-y-4">
        <EmailInputCard onVerify={handleVerify} isLoading={isLoading} />

        {result && (
          <>
            <VerificationResultCard result={result} />
            <ResultBreakdownCard checks={result.checks} />
          </>
        )}

        <RecentSingleVerificationsTable refreshKey={refreshKey} optimistic={recent} />
      </div>

      {/* ── Right sidebar ── */}
      <div className="space-y-4">
        <VerificationSummaryCard refreshKey={refreshKey} />
        <ProTipCard />
      </div>
    </div>
  );
}

export function SingleVerifyView() {
  // Provider scoped to this route; AppShell-wide auth still wraps everything.
  return (
    <VerificationProvider>
      <SingleVerifyContent />
    </VerificationProvider>
  );
}
