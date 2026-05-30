import type { Metadata } from "next";
import { BulkVerifyView } from "@/src/features/bulk-verify/components/BulkVerifyView";

export const metadata: Metadata = {
  title: "Bulk Verify · emailanswers.ai",
  description: "Upload a CSV or TXT file and verify every email address in bulk.",
};

export default function BulkVerifyPage() {
  return <BulkVerifyView />;
}
