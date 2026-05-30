"use client";

import { useEffect, useState } from "react";
import { Send, X } from "lucide-react";

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close chatbot" : "Open chatbot"}
        onClick={() => setOpen((v) => !v)}
        className="group fixed bottom-5 right-5 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#2356F6] to-[#0F5BFF] text-white shadow-lg shadow-[#2356F6]/30 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-[#2356F6]/40 active:scale-95 sm:h-12 sm:w-12"
      >
        {open
          ? <X size={18} />
          : <img src="/chatbot-icon.svg" alt="" aria-hidden className="h-7 w-7 transition-transform duration-200 group-hover:rotate-6" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Leave a message"
          className="fixed bottom-20 right-5 z-[60] w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white shadow-xl sm:w-[360px]"
        >
          <div className="relative bg-gradient-to-br from-[#2356F6] to-[#0F5BFF] px-5 pt-5 pb-5 text-white">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            >
              <X size={15} />
            </button>
            <div className="flex items-center justify-center gap-2">
              <img src="/auth-brand.svg" alt="emailanswers.ai" className="h-7 w-auto" />
            </div>
            <h2 className="mt-3 text-center text-lg font-bold tracking-tight">
              We&apos;ll be right with you
            </h2>
            <p className="mt-1 text-center text-xs text-white/85">
              AI support is rolling out soon. Leave us a message!
            </p>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-3 bg-white px-5 pt-4 pb-5"
          >
            <input
              type="text"
              placeholder="Your name"
              className="w-full rounded-lg border border-[#DCE6F3] bg-[#F4F8FF] px-3 py-2.5 text-sm text-[#111827] placeholder:text-muted-foreground focus:border-[#2356F6] focus:outline-none focus:ring-2 focus:ring-[#2356F6]/20"
            />
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-lg border border-[#DCE6F3] bg-[#F4F8FF] px-3 py-2.5 text-sm text-[#111827] placeholder:text-muted-foreground focus:border-[#2356F6] focus:outline-none focus:ring-2 focus:ring-[#2356F6]/20"
            />
            <textarea
              rows={3}
              placeholder="What do you need help with?"
              className="w-full resize-none rounded-lg border border-[#DCE6F3] bg-[#F4F8FF] px-3 py-2.5 text-sm text-[#111827] placeholder:text-muted-foreground focus:border-[#2356F6] focus:outline-none focus:ring-2 focus:ring-[#2356F6]/20"
            />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#2356F6] to-[#0F5BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            >
              <Send size={15} />
              Send message
            </button>
            <p className="text-center text-[11px] font-medium text-muted-foreground">
              We&apos;ll reply to your email within 24 hours
            </p>
          </form>
        </div>
      )}
    </>
  );
}
