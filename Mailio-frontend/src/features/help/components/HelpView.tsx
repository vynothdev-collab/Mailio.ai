"use client";

import { useState } from "react";
import { MessageCircle, Ticket, HelpCircle } from "lucide-react";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { LiveChatSection } from "./LiveChatSection";
import { SubmitTicketSection } from "./SubmitTicketSection";
import { FAQsSection } from "./FAQsSection";

type Tab = "live-chat" | "submit-ticket" | "faqs";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "live-chat", label: "Live Chat", icon: MessageCircle },
  { id: "submit-ticket", label: "Submit a Ticket", icon: Ticket },
  { id: "faqs", label: "FAQs", icon: HelpCircle },
];

export function HelpView() {
  const [active, setActive] = useState<Tab>("live-chat");

  return (
    <div className="space-y-0">
      <PageHeader
        title="Help & Support"
        subtitle="Get answers, chat with our team, or browse the FAQ."
      />

      {}
      <div className="sticky top-[57px] sm:top-[65px] z-20 -mx-4 lg:-mx-6 bg-[#EEF3FB] border-b border-[#DCE6F3] overflow-x-auto">
        <div className="flex min-w-max px-4 lg:px-6">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-medium transition-colors
                  ${isActive ? "text-[#0B47CF]" : "text-[#8B847A] hover:text-[#111827]"}`}
              >
                <Icon size={15} />
                {label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#0B47CF]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {}
      <div className="pt-4 sm:pt-5">
        {active === "live-chat" && <LiveChatSection />}
        {active === "submit-ticket" && <SubmitTicketSection />}
        {active === "faqs" && <FAQsSection />}
      </div>
    </div>
  );
}
