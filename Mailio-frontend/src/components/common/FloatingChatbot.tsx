"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

const BUTTON_SIZE = 48;
const EDGE_MARGIN = 12;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 440;
const GREETING_GAP = 12;
const STORAGE_KEY = "floating-chatbot:pos";
const DRAG_THRESHOLD = 5;

interface Pos {
  x: number;
  y: number;
}

function clampToViewport(p: Pos): Pos {
  if (typeof window === "undefined") return p;
  const maxX = window.innerWidth - BUTTON_SIZE - EDGE_MARGIN;
  const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN;
  return {
    x: Math.min(Math.max(EDGE_MARGIN, p.x), maxX),
    y: Math.min(Math.max(EDGE_MARGIN, p.y), maxY),
  };
}

function defaultPos(): Pos {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: window.innerWidth - BUTTON_SIZE - 20,
    y: window.innerHeight - BUTTON_SIZE - 20,
  };
}

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef<Pos>({ x: 0, y: 0 });
  const dragStartRef = useRef<Pos>({ x: 0, y: 0 });
  const movedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Pos;
        setPos(clampToViewport(saved));
        return;
      }
    } catch {}
    setPos(defaultPos());
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clampToViewport(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => setShowGreeting(true), 1500);
    return () => window.clearTimeout(t);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragOffsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      movedRef.current = true;
      setShowGreeting(false);
    }
    if (movedRef.current) {
      setPos(
        clampToViewport({
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        })
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const wasDrag = movedRef.current;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (wasDrag && pos) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      } catch {}
    } else {
      setOpen((v) => !v);
      setShowGreeting(false);
    }
  };

  const greetingPos = useCallback((): React.CSSProperties => {
    if (!pos) return { display: "none" };
    const vw = window.innerWidth;

    const placeRight = pos.x < 240;
    const top = pos.y + BUTTON_SIZE / 2;
    return placeRight
      ? { left: pos.x + BUTTON_SIZE + GREETING_GAP, top, transform: "translateY(-50%)" }
      : {
          left: Math.max(EDGE_MARGIN, pos.x - GREETING_GAP),
          top,
          transform: "translate(-100%, -50%)",
          maxWidth: vw - 2 * EDGE_MARGIN,
        };
  }, [pos]);

  const panelPos = useCallback((): React.CSSProperties => {
    if (!pos) return { display: "none" };
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceAbove = pos.y;
    const placeBelow = spaceAbove < PANEL_HEIGHT + GREETING_GAP;
    const top = placeBelow
      ? pos.y + BUTTON_SIZE + GREETING_GAP
      : Math.max(EDGE_MARGIN, pos.y - PANEL_HEIGHT - GREETING_GAP);

    const desiredLeft = pos.x + BUTTON_SIZE - PANEL_WIDTH;
    const left = Math.min(Math.max(EDGE_MARGIN, desiredLeft), vw - PANEL_WIDTH - EDGE_MARGIN);
    return { left, top, maxHeight: vh - 2 * EDGE_MARGIN };
  }, [pos]);

  if (!pos) return null;

  return (
    <>
      {showGreeting && !open && !dragging && (
        <div
          style={greetingPos()}
          className="fixed z-[60] flex animate-in fade-in items-center gap-1.5 rounded-full bg-[#0F5BFF] px-3.5 py-2 text-xs font-medium text-white shadow-lg shadow-black/10 ring-1 ring-[#DCE6F3] whitespace-nowrap pointer-events-none"
        >
          <span>Need a hand? I&apos;m here!</span>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? "Close chatbot" : "Open chatbot"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          left: pos.x,
          top: pos.y,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
        className="group fixed z-[60] flex items-center justify-center rounded-full bg-gradient-to-br from-[#2356F6] to-[#0F5BFF] text-white shadow-lg shadow-[#2356F6]/30 transition-transform duration-100 hover:scale-105 active:scale-95 select-none"
      >
        {open ? (
          <X size={18} />
        ) : (
          <img
            src="/chatbot-icon.svg"
            alt=""
            aria-hidden
            draggable={false}
            className="h-7 w-7 pointer-events-none transition-transform duration-200 group-hover:rotate-6"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Leave a message"
          style={{ ...panelPos(), width: PANEL_WIDTH }}
          className="fixed z-[60] overflow-y-auto rounded-2xl border border-[#DCE6F3] bg-white shadow-xl"
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
              AI support is rolling out soon <br /> Leave us a message!
            </h2>
            <p className="mt-1 text-center text-xs text-white/85">We&apos;ll be right with you</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-3 bg-white px-5 pt-4 pb-5">
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
