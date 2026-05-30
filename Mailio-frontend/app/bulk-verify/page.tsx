import type { Metadata } from "next";
import { Suspense } from "react";
import { BulkVerifyPageClient } from "./BulkVerifyPageClient";

export const metadata: Metadata = {
  title: "Bulk Verify · emailanswers.ai",
  description: "Upload a CSV or TXT file and verify every email address in bulk.",
};

export default function BulkVerifyPage() {
  return (
    <Suspense fallback={null}>
      <BulkVerifyPageClient />
    </Suspense>
  );
}
