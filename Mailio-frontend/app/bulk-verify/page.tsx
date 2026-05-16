import type { Metadata } from "next";
import { BulkVerifyView } from "@/src/features/bulk-verify/components/BulkVerifyView";

export const metadata: Metadata = {
  title: "Bulk Verify · Mailio.ai",
  description: "Upload a CSV or TXT file and verify every email address in bulk.",
};

export default function BulkVerifyPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Bulk Email Verification
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a list and verify thousands of emails at once.
        </p>
      </div>

      <BulkVerifyView />
    </>
  );
}
