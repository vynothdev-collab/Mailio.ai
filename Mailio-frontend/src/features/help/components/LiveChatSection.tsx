"use client";

import { useRef, useState, useEffect } from "react";
import {
  Send, Smile, Paperclip, Plus, MessageCircle,
  Phone, MoreHorizontal, BookOpen, Activity,
  Ticket, Lightbulb, ExternalLink, Mail,
} from "lucide-react";

type Msg = { from: "agent" | "user"; text: string; time: string };

interface Session {
  id: string;
  title: string;
  preview: string;
  date: string;
  resolved: boolean;
  messages: Msg[];
}

const SESSIONS: Session[] = [
  {
    id: "active",
    title: "Bulk verification limits",
    preview: "Currently in chat",
    date: "Today",
    resolved: false,
    messages: [
      { from: "agent", text: "Hi there! 👋 Welcome to emailanswers.ai support.\nHow can I help you today?",                            time: "10:01 AM" },
      { from: "user",  text: "Hi, I have a question about bulk verification limits.",                                              time: "10:02 AM" },
      { from: "agent", text: "Sure! On the PRO plan you get 10,000 verifications/month.\nWould you like more details?",           time: "10:02 AM" },
      { from: "user",  text: "Yes please. Can I upgrade anytime?",                                                                time: "10:03 AM" },
      { from: "agent", text: "Yes, you can upgrade anytime from the Billing settings.\nThe new limits will apply immediately.",   time: "10:03 AM" },
    ],
  },
  {
    id: "s1",
    title: "Billing inquiry",
    preview: "My invoice for April wasn't received.",
    date: "May 15",
    resolved: true,
    messages: [
      { from: "agent", text: "Hi there! 👋 Welcome to emailanswers.ai support. How can I help you today?", time: "2:10 PM" },
      { from: "user",  text: "Hi, I didn't receive my invoice for April billing.",                   time: "2:11 PM" },
      { from: "agent", text: "I've resent the April invoice to your email. You should receive it within a few minutes.",          time: "2:13 PM" },
    ],
  },
  {
    id: "s2",
    title: "Technical support",
    preview: "Bulk job stuck at 0% for 20 minutes.",
    date: "May 8",
    resolved: true,
    messages: [
      { from: "agent", text: "Hi there! 👋 Welcome to emailanswers.ai support. How can I help you today?",      time: "11:00 AM" },
      { from: "user",  text: "My bulk verification job has been stuck at 0% for over 20 minutes.",         time: "11:01 AM" },
      { from: "agent", text: "The job has completed successfully. Your results are now in the Results tab.", time: "11:06 AM" },
    ],
  },
  {
    id: "s3",
    title: "Account access",
    preview: "Can't log in after password reset.",
    date: "Apr 28",
    resolved: true,
    messages: [
      { from: "agent", text: "Hi there! 👋 Welcome to emailanswers.ai support. How can I help you today?",  time: "9:30 AM" },
      { from: "user",  text: "I reset my password but still can't log in.",                           time: "9:31 AM" },
      { from: "agent", text: "Try logging in via an incognito window — that should clear the issue.", time: "9:32 AM" },
      { from: "user",  text: "That worked! Thank you so much.",                                       time: "9:34 AM" },
    ],
  },
  {
    id: "s4",
    title: "Export / Results",
    preview: "How do I export results to CSV?",
    date: "Apr 20",
    resolved: true,
    messages: [
      { from: "agent", text: "Hi there! 👋 Welcome to emailanswers.ai support. How can I help you today?",           time: "3:00 PM" },
      { from: "user",  text: "How do I export my verification results to CSV?",                                 time: "3:01 PM" },
      { from: "agent", text: "Go to Results, find your job, and click the Download button. The CSV includes all status columns.", time: "3:02 PM" },
    ],
  },
];

const QUICK_ACTIONS = [
  { icon: BookOpen,  label: "View Help Center",    sub: "Browse articles and guides"   },
  { icon: Activity,  label: "Check System Status", sub: "View current system status"   },
  { icon: Ticket,    label: "Submit a Ticket",     sub: "Get help via email"            },
  { icon: Lightbulb, label: "Feature Requests",    sub: "Share your ideas"             },
];

export function LiveChatSection() {
  const [activeId,    setActiveId]    = useState<string>("active");
  const [messages,    setMessages]    = useState<Msg[]>(SESSIONS[0].messages);
  const [isLive,      setIsLive]      = useState(true);
  const [input,       setInput]       = useState("");
  const [agentTyping, setAgentTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentTyping]);

  function loadSession(s: Session) {
    setActiveId(s.id);
    setMessages(s.messages);
    setIsLive(!s.resolved);
    setInput("");
    setAgentTyping(false);
  }

  function send() {
    const text = input.trim();
    if (!text || !isLive) return;
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { from: "user", text, time: t }]);
    setInput("");
    setAgentTyping(true);
    setTimeout(() => {
      setAgentTyping(false);
      setMessages((prev) => [
        ...prev,
        { from: "agent", text: "Thanks for reaching out! Our team will follow up shortly.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    }, 1200);
  }

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
      {/* Sessions sidebar */}
      <div className="xl:w-64 flex flex-col rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden xl:self-stretch">
        <div className="flex items-center justify-between border-b border-[#DCE6F3] px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={13} className="text-[#0B47CF]" />
            <p className="text-xs font-semibold text-[#111827]">Past Sessions</p>
          </div>
          <button
            onClick={() => loadSession(SESSIONS[0])}
            className="flex items-center gap-1 rounded-lg bg-[#EEF3FB] border border-[#DCE6F3] px-2 py-1 text-[11px] font-medium text-[#0B47CF] hover:bg-[#dce6f3] transition-colors"
          >
            <Plus size={10} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#DCE6F3]/60">
          {SESSIONS.map((s) => {
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => loadSession(s)}
                className={`w-full flex items-start gap-2.5 px-3.5 py-3 text-left transition-colors
                  ${isActive ? "bg-[#EEF3FB]" : "hover:bg-[#F4F8FF]"}`}
              >
                <div className="relative mt-0.5 shrink-0">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isActive ? "bg-[#0B47CF]" : "bg-[#EEF3FB]"}`}>
                    <MessageCircle size={12} className={isActive ? "text-white" : "text-[#0B47CF]"} />
                  </div>
                  {!s.resolved && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className={`text-xs font-semibold truncate ${isActive ? "text-[#0B47CF]" : "text-[#111827]"}`}>{s.title}</p>
                    {s.resolved && (
                      <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">Done</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{s.preview}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.date}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t border-[#DCE6F3] p-3">
          <button className="w-full text-xs font-medium text-[#0B47CF] py-1.5 rounded-lg hover:bg-[#EEF3FB] transition-colors">
            View all conversations
          </button>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 520 }}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#DCE6F3] px-4 sm:px-5 py-3 bg-white">
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B47CF] text-white text-xs font-bold">SA</div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#111827]">Support Agent</p>
            <p className="text-xs text-muted-foreground">
              {isLive ? "Typically replies in < 2 minutes" : "This session is closed"}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#F4F8FF] hover:text-[#0B47CF] transition-colors">
              <Phone size={14} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#F4F8FF] hover:text-[#0B47CF] transition-colors">
              <Paperclip size={14} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#F4F8FF] hover:text-[#0B47CF] transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 bg-[#F4F8FF]/30">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              {m.from === "agent" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B47CF] text-white text-[10px] font-bold mt-0.5">SA</div>
              )}
              <div className="max-w-[75%] sm:max-w-[65%] space-y-1">
                <div className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line
                  ${m.from === "user"
                    ? "bg-[#0B47CF] text-white rounded-br-sm"
                    : "bg-white border border-[#DCE6F3] text-[#111827] rounded-bl-sm shadow-sm"}`}>
                  {m.text}
                </div>
                <p className={`text-[10px] text-muted-foreground flex items-center gap-1 ${m.from === "user" ? "justify-end" : ""}`}>
                  {m.time}
                  {m.from === "user" && <span className="text-[#0B47CF] font-bold">✓✓</span>}
                </p>
              </div>
            </div>
          ))}

          {agentTyping && (
            <div className="flex gap-2.5 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B47CF] text-white text-[10px] font-bold mt-0.5">SA</div>
              <div className="bg-white border border-[#DCE6F3] rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#DCE6F3] bg-white px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          {isLive ? (
            <>
              <button className="shrink-0 text-muted-foreground hover:text-[#0B47CF] transition-colors"><Paperclip size={16} /></button>
              <button className="shrink-0 text-muted-foreground hover:text-[#0B47CF] transition-colors"><Smile size={16} /></button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !agentTyping && send()}
                placeholder="Type a message…"
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground text-[#111827] min-w-0"
              />
              <button
                onClick={send}
                disabled={!input.trim() || agentTyping}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#0B47CF] text-white hover:opacity-80 transition-opacity disabled:opacity-30"
              >
                <Send size={13} />
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">This session is closed.</p>
              <button
                onClick={() => loadSession(SESSIONS[0])}
                className="flex items-center gap-1.5 rounded-lg bg-[#0B47CF] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Plus size={12} /> New Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right info sidebar */}
      <div className="xl:w-72 flex flex-col gap-3">
        {/* Agent info */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B47CF] text-white font-bold">SA</div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">Support Agent</p>
              <p className="text-xs font-medium text-emerald-600">● Online</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Member since Mar 2023</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-[#111827] mb-1">We&apos;re here to help!</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">Our team is available Mon–Fri, 9:00 AM – 6:00 PM (UTC)</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF3FB] border border-[#DCE6F3] px-2.5 py-1 text-[11px] font-semibold text-[#0B47CF]">
            Typically replies in &lt; 2 minutes
          </span>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DCE6F3]">
            <p className="text-xs font-semibold text-[#111827]">Quick actions</p>
          </div>
          <div className="divide-y divide-[#DCE6F3]/60">
            {QUICK_ACTIONS.map(({ icon: Icon, label, sub }) => (
              <button key={label} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F4F8FF] transition-colors group">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FB]">
                  <Icon size={13} className="text-[#0B47CF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#111827]">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{sub}</p>
                </div>
                <ExternalLink size={11} className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Need urgent help */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm p-4 sm:p-5 space-y-3">
          <p className="text-sm font-semibold text-[#111827]">Need urgent help?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Contact us directly and we&apos;ll get back to you as soon as possible.</p>
          <button className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-[#0B47CF] text-xs font-semibold text-[#0B47CF] hover:bg-[#EEF3FB] transition-colors">
            <Mail size={13} /> Email Support
          </button>
        </div>
      </div>
    </div>
  );
}
