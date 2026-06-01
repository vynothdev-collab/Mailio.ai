import type { Metadata } from "next";
import { HelpView } from "@/src/features/help/components/HelpView";

export const metadata: Metadata = {
  title: "Help & Support · emailanswers.ai",
  description: "Get help and support for emailanswers.ai.",
};

export default function HelpPage() {
  return <HelpView />;
}
