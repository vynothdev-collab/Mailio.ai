"use client";

import { useRef, useState, useEffect } from "react";
import {
  Bot, Send, Sparkles, ThumbsUp, ThumbsDown, Trash2,
  Paperclip, Smile, ChevronRight, Zap, Shield, Clock,
  HelpCircle,
} from "lucide-react";

const BOT_REPLIES: Record<string, string> = {
  "How do bulk verification credits work?":  "Bulk verification uses 1 credit per email in the list. Credits are deducted when a job starts, not when it completes. You can view usage in the Usage section.",
  "How do I verify emails in bulk?":         "Go to Bulk Verify in the sidebar, upload a .csv or .txt file (up to 50 MB), then click Upload & Verify. Results are ready in minutes.",
  "What counts as a valid email?":           "An email is VALID when it passes syntax, MX-record, SMTP, and mailbox checks — meaning the inbox actually exists.",
  "How do I get my API key?":                "Head to Settings → API Keys, then click Generate Key. Copy it and keep it safe — it won't be shown again.",
  "Why is my verification stuck?":           "Large jobs (10k+) can take a few minutes. Refresh the Results page. If stuck over 10 minutes, contact our Live Chat support.",
  "What does CATCHALL status mean?":            "CATCHALL emails belong to catch-all domains — the domain accepts all mail, so the exact mailbox existence can't be confirmed.",
  "How do I cancel my plan?":                "Go to Billing → Manage Plan and click Cancel Subscription. Your credits remain active until the end of the billing cycle.",
  "Credits":            "Credits are used to perform email verifications. Each verification (single or bulk) consumes 1 credit. You can purchase more from the Billing section.",
  "Billing":            "We accept all major cards and PayPal. Invoices are available under Billing → Invoice History. Upgrades take effect immediately.",
  "API":                "Your API key is under Settings → API Keys. The rate limit is 10 req/s on PRO and 50 req/s on ULTIMATE. Use GET /v1/verify?email=... to verify a single address.",
  "Bulk Verification":  "Upload a .csv or .txt file up to 50 MB. Most jobs finish in 1–5 minutes. Download results as CSV from the Results page.",
  "Results":            "Results include VALID, INVALID, CATCHALL, UNKNOWN, and DISPOSABLE statuses. Download the full CSV from Results → your job → Download.",
  "Integrations":       "emailanswers.ai integrates with Zapier, Make, and any platform that supports REST APIs. See the API docs for webhook setup.",
};
const DEFAULT_REPLY = "I'm not sure about that yet! Try rephrasing, or contact our team via Live Chat for detailed help.";

const TOPIC_CHIPS = ["Credits", "Billing", "API", "Bulk Verification", "Results", "Integrations"];

const SUGGESTED_TOPICS = [
  "How credits work",
  "Bulk verification guide",
  "API authentication",
  "Pricing & plans",
  "Account settings",
  "Results & exports",
];

type Msg = { from: "user" | "bot"; text: string; time: string };

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const INITIAL: Msg[] = [
  {
    from: "bot",
    text: "👋 Hi! I'm your AI assistant for emailanswers.ai.\nI can help you with account setup, billing, API usage, bulk verification, credits, and any other questions you have.\nHow can I help you today?",
    time: now(),
  },
];

export function AIChatbotSection() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL);
  const [input,    setInput]    = useState("");
  const [typing,   setTyping]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function clearChat() {
    setMessages(INITIAL);
    setInput("");
    setTyping(false);
  }

  function send(text: string) {
    const q = text.trim();
    if (!q || typing) return;
    const userMsg: Msg = { from: "user", text: q, time: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply = BOT_REPLIES[q] ?? DEFAULT_REPLY;
      setMessages((prev) => [...prev, { from: "bot", text: reply, time: now() }]);
    }, 900);
  }

  const showChips = !typing && messages[messages.length - 1]?.from === "bot";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Main chat */}
      <div className="flex-1 rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 540 }}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#DCE6F3] px-4 sm:px-5 py-3 bg-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B47CF] text-white shrink-0">
            <Bot size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#111827]">AI Assistant</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Powered by emailanswers.ai · Trained on emailanswers.ai docs</p>
          </div>
          <div className="flex items-center gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#F4F8FF] hover:text-[#0B47CF] transition-colors">
              <ThumbsUp size={14} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#F4F8FF] hover:text-[#0B47CF] transition-colors">
              <ThumbsDown size={14} />
            </button>
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 rounded-lg border border-[#DCE6F3] px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-[#F4F8FF] hover:text-[#111827] transition-colors"
            >
              <Trash2 size={12} /> Clear chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 bg-[#F4F8FF]/30">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              {m.from === "bot" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B47CF] text-white mt-0.5">
                  <Bot size={14} />
                </div>
              )}
              <div className={`max-w-[75%] sm:max-w-[68%] space-y-1`}>
                <div className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-line
                  ${m.from === "user"
                    ? "bg-[#0B47CF] text-white rounded-br-sm"
                    : "bg-white border border-[#DCE6F3] text-[#111827] rounded-bl-sm shadow-sm"}`}>
                  {m.text}
                </div>
                <p className={`text-[10px] text-muted-foreground flex items-center gap-1 ${m.from === "user" ? "justify-end" : ""}`}>
                  {m.from === "bot" ? `AI Assistant · ${m.time}` : m.time}
                  {m.from === "user" && <span className="text-[#0B47CF] font-bold">✓✓</span>}
                </p>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B47CF] text-white mt-0.5">
                <Bot size={14} />
              </div>
              <div className="bg-white border border-[#DCE6F3] rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#0B47CF] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-[#0B47CF] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-[#0B47CF] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* Quick question chips */}
          {showChips && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Quick questions</p>
              <div className="flex flex-wrap gap-2">
                {TOPIC_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => send(chip)}
                    className="rounded-full border border-[#DCE6F3] bg-white px-3 py-1.5 text-xs font-medium text-[#111827] hover:border-[#0B47CF] hover:bg-[#EEF3FB] hover:text-[#0B47CF] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-[#DCE6F3] bg-white">
          <div className="flex items-end gap-2 px-3 sm:px-4 py-3">
            <button className="shrink-0 mb-1 text-muted-foreground hover:text-[#0B47CF] transition-colors">
              <Paperclip size={16} />
            </button>
            <button className="shrink-0 mb-1 text-muted-foreground hover:text-[#0B47CF] transition-colors">
              <Smile size={16} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask anything about emailanswers.ai…"
              rows={1}
              className="flex-1 resize-none text-sm bg-transparent outline-none placeholder:text-muted-foreground text-[#111827] min-w-0 max-h-24 leading-relaxed"
              style={{ overflowY: "auto" }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || typing}
              className="shrink-0 mb-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#0B47CF] text-white hover:opacity-80 transition-opacity disabled:opacity-30"
            >
              <Send size={13} />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground pb-2 px-4">
            AI responses may be inaccurate. Please verify important information.
          </p>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="lg:w-72 xl:w-80 flex flex-col gap-3">
        {/* 24/7 AI Support card */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B47CF] text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">24/7 AI Support</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Our AI assistant is always here to help you get the answers you need.</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { icon: Zap,    label: "Instant Answers",    sub: "Get help in seconds"            },
              { icon: Shield, label: "Trained & Reliable", sub: "Based on our documentation"     },
              { icon: Clock,  label: "Always Available",   sub: "24/7 support, every day"        },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FB]">
                  <Icon size={13} className="text-[#0B47CF]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#111827]">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested topics */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DCE6F3]">
            <p className="text-xs font-semibold text-[#111827]">Suggested topics</p>
          </div>
          <div className="divide-y divide-[#DCE6F3]/60">
            {SUGGESTED_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => send(topic)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#F4F8FF] transition-colors group"
              >
                <span className="text-xs text-[#111827] group-hover:text-[#0B47CF] transition-colors">{topic}</span>
                <ChevronRight size={13} className="text-muted-foreground group-hover:text-[#0B47CF] transition-colors shrink-0" />
              </button>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[#DCE6F3]">
            <button className="w-full flex items-center justify-center gap-2 text-xs font-medium text-[#0B47CF] hover:underline transition-colors">
              <HelpCircle size={13} /> View all FAQs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
