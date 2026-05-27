import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Support · Mailio.ai",
  description: "Get help and support for Mailio.ai.",
};

export default function HelpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <img src="/brand-logo.svg" alt="Mailio.ai" className="h-12 w-auto mb-10" />
      <h1 className="text-3xl font-bold text-foreground mb-3">Coming Soon</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        Help & Support is currently under development. Check back soon!
      </p>
    </div>
  );
}
