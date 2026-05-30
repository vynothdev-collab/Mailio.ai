"use client";

import { useState } from "react";
import {
  Search, LayoutGrid, Coins, Receipt, Code2, MailCheck,
  ChevronDown, ChevronUp, Ticket,
} from "lucide-react";

type Category = "Credits" | "Billing" | "API" | "Bulk";

const CATEGORY_META = [
  { id: "All" as const,      label: "All Articles",      Icon: LayoutGrid, count: 24 },
  { id: "Credits" as const,  label: "Credits",           Icon: Coins,      count: 6  },
  { id: "Billing" as const,  label: "Billing",           Icon: Receipt,    count: 6  },
  { id: "API" as const,      label: "API",               Icon: Code2,      count: 5  },
  { id: "Bulk" as const,     label: "Bulk Verification", Icon: MailCheck,  count: 7  },
];

const FAQS: Record<Category, { q: string; a: string }[]> = {
  Credits: [
    { q: "What are credits and how do they work?",          a: "Credits are used to perform email verifications on our platform. Each verification (single or bulk) consumes credits based on the email status returned. You can purchase more credits anytime from the Billing section." },
    { q: "How many credits does each verification cost?",   a: "Each email verification costs 1 credit regardless of the result status (VALID, INVALID, CATCHALL, etc.)." },
    { q: "Do credits expire?",                              a: "Credits reset at the start of each billing cycle and do not roll over. Consider upgrading your plan if you consistently reach your limit." },
    { q: "Can I get a refund for unused credits?",          a: "Credits are non-refundable once purchased. However, they remain active until your billing cycle ends." },
    { q: "What happens when I run out of credits?",         a: "Verification requests will be paused. You can upgrade your plan or purchase a credit top-up from the Billing page." },
    { q: "Can I buy additional credits without upgrading?", a: "Yes. Go to Billing → Add Credits to purchase one-time credit bundles starting at 5,000 verifications." },
  ],
  Billing: [
    { q: "How do I upgrade or downgrade my plan?",          a: "Go to Billing → Manage Plan. Upgrades take effect immediately. Downgrades take effect at the end of your current billing cycle." },
    { q: "What payment methods are accepted?",              a: "We accept all major credit/debit cards (Visa, Mastercard, Amex) and PayPal. Bank transfers are available for annual plans." },
    { q: "Where can I download my invoices?",               a: "Invoices are available under Billing → Invoice History. Each invoice can be downloaded as a PDF." },
    { q: "Will I be charged if I cancel during the month?", a: "No. Cancellation stops future charges. You keep access and credits until your current billing period ends." },
    { q: "Is there a free trial?",                          a: "Yes, new accounts receive 100 free verification credits to try the platform." },
    { q: "How do I update my payment method?",              a: "Go to Billing → Payment Methods to add, remove, or update your credit card details." },
  ],
  API: [
    { q: "Where do I find my API key?",                    a: "Go to Settings → API Keys. Click Generate Key and copy it immediately — it won't be shown again." },
    { q: "What is the API rate limit?",                    a: "PRO plan: 10 requests/second. ULTIMATE plan: 50 requests/second. Burst requests exceeding the limit return HTTP 429." },
    { q: "Is there an API sandbox for testing?",           a: "Yes. Use the base URL https://sandbox.mailio.ai/api/v1 with your key. Sandbox verifications do not consume credits." },
    { q: "How do I verify a single email via API?",        a: "Send a GET request to /v1/verify?email=you@example.com with your Authorization: Bearer <key> header." },
    { q: "What response codes does the API return?",       a: "The API returns 200 for success, 400 for invalid input, 401 for unauthorized, 429 for rate limit exceeded, and 500 for server errors." },
  ],
  Bulk: [
    { q: "What file formats are supported for bulk upload?",a: "We support .csv and .txt files. Each line or column should contain one email address. Maximum file size is 50 MB." },
    { q: "How long does a bulk job take?",                  a: "Most jobs complete in 1–5 minutes. Very large lists (100k+) may take up to 30 minutes depending on server load." },
    { q: "Can I download the results?",                     a: "Yes. Go to Results, find your job, and click Download. Results are available as CSV with status columns." },
    { q: "What does the CATCHALL status mean?",                a: "CATCHALL emails belong to catch-all domains that accept all incoming mail. The exact mailbox existence cannot be confirmed." },
    { q: "Can I pause or cancel a bulk job?",               a: "Yes, you can cancel a running job from the Results page. Credits for unprocessed emails will be refunded." },
    { q: "Is there a limit on emails I can verify at once?",a: "The file size limit is 50 MB, which typically supports up to 500,000 emails per job." },
    { q: "How do I interpret the verification results?",    a: "Results include VALID, INVALID, CATCHALL, UNKNOWN, and DISPOSABLE statuses. Download the CSV for full details." },
  ],
};

const ALL_CATS: Category[] = ["Credits", "Billing", "API", "Bulk"];

export function FAQsSection() {
  const [activeFilter, setActiveFilter] = useState<Category | "All">("All");
  const [search,       setSearch]       = useState("");
  const [openSections, setOpenSections] = useState<Set<Category>>(new Set(["Credits"]));
  const [openItem,     setOpenItem]     = useState<string | null>("Credits-0");

  const visibleCats = activeFilter === "All" ? ALL_CATS : [activeFilter as Category];

  function selectFilter(id: Category | "All") {
    setActiveFilter(id);
    setSearch("");
    setOpenItem(null);
    if (id !== "All") {
      setOpenSections(new Set([id as Category]));
    } else {
      setOpenSections(new Set(["Credits"]));
    }
  }

  function toggleSection(cat: Category) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) { next.delete(cat); }
      else               { next.add(cat); }
      return next;
    });
    setOpenItem(null);
  }

  function getFiltered(cat: Category) {
    if (!search.trim()) return FAQS[cat];
    const q = search.toLowerCase();
    return FAQS[cat].filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }

  return (
    <div className="space-y-4">
      {/* Top search banner */}
      <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm px-5 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-[#111827]">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Find quick answers to common questions about emailanswers.ai.</p>
        </div>
        <div className="relative sm:w-72 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpenSections(new Set(ALL_CATS)); }}
            placeholder="Search for articles..."
            className="w-full h-9 rounded-xl border border-[#DCE6F3] bg-[#F4F8FF]/60 pl-8 pr-3 text-sm text-[#111827] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B47CF]/20"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left sidebar */}
        <div className="lg:w-64 xl:w-72 flex flex-col gap-3">
          <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#DCE6F3]">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Categories</p>
            </div>
            <div className="p-1.5 space-y-0.5">
              {CATEGORY_META.map(({ id, label, Icon, count }) => {
                const isActive = activeFilter === id;
                return (
                  <button
                    key={id}
                    onClick={() => selectFilter(id)}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors
                      ${isActive ? "bg-[#EEF3FB]" : "hover:bg-[#F4F8FF]"}`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? "bg-[#0B47CF]" : "bg-[#EEF3FB]"}`}>
                      <Icon size={13} className={isActive ? "text-white" : "text-[#0B47CF]"} />
                    </div>
                    <span className={`flex-1 text-xs sm:text-sm font-medium ${isActive ? "text-[#0B47CF]" : "text-[#111827]"}`}>{label}</span>
                    <span className={`text-[11px] font-semibold rounded-full px-1.5 py-0.5 min-w-[22px] text-center ${isActive ? "bg-[#0B47CF] text-white" : "bg-[#EEF3FB] text-[#0B47CF]"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm p-4 sm:p-5 space-y-3">
            <p className="text-sm font-semibold text-[#111827]">Can't find what you need?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Our support team is here to help.</p>
            <button className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-[#0B47CF] text-xs font-semibold text-[#0B47CF] hover:bg-[#EEF3FB] transition-colors">
              <Ticket size={13} /> Submit a Ticket
            </button>
          </div>
        </div>

        {/* Right: accordion sections */}
        <div className="flex-1 space-y-3">
          {visibleCats.map((cat) => {
            const meta  = CATEGORY_META.find((m) => m.id === cat)!;
            const faqs  = getFiltered(cat);
            const isOpen = openSections.has(cat);
            if (faqs.length === 0) return null;

            return (
              <div key={cat} className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(cat)}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 text-left hover:bg-[#F4F8FF]/40 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FB]">
                    <meta.Icon size={15} className="text-[#0B47CF]" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-[#111827]">{meta.label}</span>
                  <span className="text-xs text-muted-foreground mr-3">{faqs.length} articles</span>
                  {isOpen ? <ChevronUp size={15} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={15} className="shrink-0 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="border-t border-[#DCE6F3]">
                    {faqs.map((faq, i) => {
                      const key    = `${cat}-${i}`;
                      const isItemOpen = openItem === key;
                      return (
                        <div key={i} className="border-b border-[#DCE6F3]/60 last:border-0">
                          <button
                            onClick={() => setOpenItem(isItemOpen ? null : key)}
                            className={`w-full flex items-start justify-between gap-3 px-4 sm:px-5 py-3 text-left transition-colors ${isItemOpen ? "bg-[#F4F8FF]/60" : "hover:bg-[#F4F8FF]/40"}`}
                          >
                            <p className={`text-xs sm:text-sm font-medium leading-snug ${isItemOpen ? "text-[#0B47CF]" : "text-[#111827]"}`}>{faq.q}</p>
                            <span className="shrink-0 mt-0.5 text-muted-foreground">
                              {isItemOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          </button>
                          {isItemOpen && (
                            <div className="px-4 sm:px-5 pb-4 pt-1">
                              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {search.trim() !== "" && visibleCats.every((cat) => getFiltered(cat).length === 0) && (
            <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm px-6 py-14 text-center">
              <p className="text-sm font-semibold text-[#111827]">No results for &ldquo;{search}&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-1.5">Try different keywords or browse the categories on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
