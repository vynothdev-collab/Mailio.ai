"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";

export interface ComboboxItem {
  id:        string;
  primary:   string;          // first line — e.g. user name / enterprise name
  secondary?: string;         // second line — e.g. email / domain
  hint?:     string;          // right-side hint — e.g. plan / role
}

interface Props<T extends ComboboxItem> {
  value:        T | null;
  onChange:     (item: T | null) => void;
  fetcher:      (query: string) => Promise<T[]>;
  placeholder?: string;
  emptyText?:   string;
  className?:   string;
  disabled?:    boolean;
  /** Min chars before fetching. Defaults to 1 so blank shows top recent. */
  minChars?: number;
}

export default function AsyncCombobox<T extends ComboboxItem>({
  value,
  onChange,
  fetcher,
  placeholder = "Search…",
  emptyText   = "No matches",
  className   = "",
  disabled    = false,
  minChars    = 1,
}: Props<T>) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    if (query.length > 0 && query.length < minChars) {
      setItems([]);
      return;
    }
    const reqId = ++reqRef.current;
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const list = await fetcher(query);
        if (reqId === reqRef.current) {
          setItems(list);
          setActiveIdx(0);
        }
      } catch {
        if (reqId === reqRef.current) setItems([]);
      } finally {
        if (reqId === reqRef.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, open, fetcher, minChars]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (item: T) => {
    onChange(item);
    setQuery("");
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        return;
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && items[activeIdx]) {
      e.preventDefault();
      pick(items[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary truncate">{value.primary}</p>
            {value.secondary && (
              <p className="text-[11px] text-text-muted truncate">{value.secondary}</p>
            )}
          </div>
          {value.hint && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white text-text-secondary border border-gray-200">{value.hint}</span>
          )}
          <button
            type="button"
            onClick={() => { onChange(null); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="p-1 rounded hover:bg-white text-text-muted"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={query}
            disabled={disabled}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            placeholder={placeholder}
            className="w-full rounded-md border border-gray-300 pl-8 pr-8 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50"
            autoComplete="off"
          />
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        </div>
      )}

      {open && !value && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-[180px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
            </div>
          ) : items.length === 0 ? (
            <div className="py-4 text-center text-xs text-text-muted">{emptyText}</div>
          ) : (
            <ul role="listbox">
              {items.map((item, i) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => { e.preventDefault(); pick(item); }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                    i === activeIdx ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{item.primary}</p>
                    {item.secondary && (
                      <p className="text-[11px] text-text-muted truncate">{item.secondary}</p>
                    )}
                  </div>
                  {item.hint && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-text-secondary shrink-0">
                      {item.hint}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
