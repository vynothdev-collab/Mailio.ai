"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";
import type { ResultsFilters, TypeFilter } from "../types";

const TYPE_OPTIONS: { label: string; value: TypeFilter }[] = [
  { label: "All",    value: "all"    },
  { label: "Single", value: "single" },
  { label: "Bulk",   value: "bulk"   },
];

interface Props {
  filters:  ResultsFilters;
  onChange: (patch: Partial<ResultsFilters>) => void;
}

export function ResultsFiltersBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative w-full sm:min-w-48 sm:max-w-64 sm:flex-1">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search email or file…"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value, page: 1 })}
          className="pl-7 h-8 sm:h-9 text-xs sm:text-sm"
        />
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5 sm:p-1 self-start sm:self-auto">
        {TYPE_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onChange({ type: value, page: 1 })}
            className={cn(
              "rounded-md px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium transition-colors",
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
