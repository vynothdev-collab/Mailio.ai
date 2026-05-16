"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, LayoutDashboard, Mail, MailOpen, BarChart3, TrendingUp, CreditCard, Settings, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";

interface QuickLink {
  label: string;
  href:  string;
  Icon:  React.ElementType;
  sub:   string;
}

const QUICK_LINKS: QuickLink[] = [
  { label: "Dashboard",     href: "/dashboard",     Icon: LayoutDashboard, sub: "Overview & stats"          },
  { label: "Single Verify", href: "/single-verify", Icon: Mail,            sub: "Verify one email"          },
  { label: "Bulk Verify",   href: "/bulk-verify",   Icon: MailOpen,        sub: "Upload & verify a list"    },
  { label: "Results",       href: "/results",       Icon: BarChart3,       sub: "All verification results"  },
  { label: "Usage",         href: "/usage",         Icon: TrendingUp,      sub: "Quota & usage stats"       },
  { label: "Billing",       href: "/billing",       Icon: CreditCard,      sub: "Plan & invoices"           },
  { label: "Settings",      href: "/settings",      Icon: Settings,        sub: "Password & notifications"  },
];

export function SearchBar() {
  const [query,  setQuery]  = useState("");
  const [open,   setOpen]   = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? QUICK_LINKS.filter((l) =>
        l.label.toLowerCase().includes(query.toLowerCase()) ||
        l.sub.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_LINKS;

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  }, [router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((v) => Math.min(v + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((v) => Math.max(v - 1, 0)); }
    if (e.key === "Enter" && filtered[active]) navigate(filtered[active].href);
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  }

  return (
    <div ref={containerRef} className="relative hidden sm:flex max-w-xs w-full">
      <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Search pages…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="pl-8 h-9 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:border-ring"
      />

      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-72 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden py-1">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {query ? "Results" : "Quick navigation"}
          </p>
          {filtered.map(({ label, href, Icon, sub }, i) => (
            <button
              key={href}
              onMouseDown={() => navigate(href)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                active === i ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon size={13} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
              {active === i && <ArrowRight size={12} className="text-muted-foreground shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-72 rounded-xl border border-border bg-card shadow-lg z-50 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No results for <span className="font-medium text-foreground">"{query}"</span></p>
        </div>
      )}
    </div>
  );
}
