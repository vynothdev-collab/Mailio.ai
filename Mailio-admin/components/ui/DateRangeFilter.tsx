"use client";

import { Calendar, ChevronDown } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

export default function DateRangeFilter({ value, onChange, className = "" }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Calendar className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none pl-8 sm:pl-9 pr-8 sm:pr-9 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-text-primary cursor-pointer"
      >
        {DATE_RANGES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted pointer-events-none" />
    </div>
  );
}
