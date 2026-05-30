"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";
import type { ResultsFilters, StatusFilter, TypeFilter } from "../types";

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All",     value: "all"     },
  { label: "Valid",   value: "valid"   },
  { label: "Invalid", value: "invalid" },
  { label: "Catchall",   value: "catchall"   },
];

const TYPE_OPTIONS: { label: string; value: TypeFilter }[] = [
  { label: "All",    value: "all"    },
  { label: "Single", value: "single" },
  { label: "Bulk",   value: "bulk"   },
];

interface Props {
  filters:   ResultsFilters;
  onChange:  (patch: Partial<ResultsFilters>) => void;
}

export function ResultsFiltersBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1 sm:max-w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search email or file…"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value, page: 1 })}
          className="pl-8 h-9 text-sm"
        />
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {STATUS_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onChange({ status: value, page: 1 })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filters.status === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {TYPE_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onChange({ type: value, page: 1 })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filters.type === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
