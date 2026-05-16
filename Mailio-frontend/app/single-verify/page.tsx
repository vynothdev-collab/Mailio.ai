import type { Metadata } from "next";
import { SingleVerifyView } from "@/src/features/single-verify/components/SingleVerifyView";

export const metadata: Metadata = {
  title: "Single Verify · Mailio.ai",
  description: "Verify one email address instantly to reduce bounce rates and improve deliverability.",
};

export default function SingleVerifyPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Single Email Verification
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify one email address instantly to reduce bounce rates and improve deliverability.
        </p>
      </div>

      <SingleVerifyView />
    </>
  );
}
