import type { Metadata } from "next";
import { SingleVerifyView } from "@/src/features/single-verify/components/SingleVerifyView";

export const metadata: Metadata = {
  title: "Single Verify · Mailio.ai",
  description: "Verify one email address instantly to reduce bounce rates and improve deliverability.",
};

export default function SingleVerifyPage() {
  return <SingleVerifyView />;
}
