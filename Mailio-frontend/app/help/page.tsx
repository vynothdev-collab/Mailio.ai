import type { Metadata } from "next";
import { ComingSoon } from "@/src/components/shared/ComingSoon";

export const metadata: Metadata = {
  title: "Help & Support · Mailio.ai",
  description: "Get help and support for Mailio.ai.",
};

export default function HelpPage() {
  return <ComingSoon description="We're building something amazing." />;
}
