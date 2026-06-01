"use client";

import { useEffect, useState } from "react";
import { VerificationProvider, useVerificationHistory } from "@/src/context/VerificationContext";
import { useSingleVerify } from "../hooks/useSingleVerify";
import { EmailInputCard }                  from "./EmailInputCard";
import { VerificationResultCard }          from "./VerificationResultCard";
import { VerificationSummaryCard }         from "./VerificationSummaryCard";
import { RecentSingleVerificationsTable }  from "./RecentSingleVerificationsTable";
import { ProTipCard }                      from "./ProTipCard";
import { PageHeader }                      from "@/src/components/layout/PageHeader";
import { SingleVerifyContentSkeleton }     from "@/src/components/shared/Skeleton";

function SingleVerifyContent() {
  const { state, result, verify } = useSingleVerify();
  const { recent }                = useVerificationHistory();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const isLoading = state === "loading";

  const handleVerify = async (email: string) => {
    await verify(email);
    setRefreshKey((k) => k + 1);
  };

  const triggerRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    if (!refreshing) return;
    const t = window.setTimeout(() => setRefreshing(false), 600);
    return () => window.clearTimeout(t);
  }, [refreshing, refreshKey]);

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Single Email Verification"
        subtitle="Verify one email address instantly to reduce bounce rates and improve deliverability."
        onRefresh={triggerRefresh}
        refreshing={refreshing}
      />

      {refreshing ? (
        <SingleVerifyContentSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
          <div className="lg:col-span-2 space-y-4">
            <EmailInputCard onVerify={handleVerify} isLoading={isLoading} />

            {result && <VerificationResultCard result={result} />}

            <RecentSingleVerificationsTable
              refreshKey={refreshKey}
              optimistic={recent}
              onDeleted={() => setRefreshKey((k) => k + 1)}
            />
          </div>

          <div className="space-y-4">
            <VerificationSummaryCard refreshKey={refreshKey} />
            <ProTipCard />
          </div>
        </div>
      )}
    </div>
  );
}

export function SingleVerifyView() {
  return (
    <VerificationProvider>
      <SingleVerifyContent />
    </VerificationProvider>
  );
}
