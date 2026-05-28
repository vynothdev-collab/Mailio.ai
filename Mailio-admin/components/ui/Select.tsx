"use client";

import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  label,
}: Props) {
  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-[10px] sm:text-xs font-medium text-text-secondary mb-1 sm:mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-2.5 sm:px-3 pr-8 sm:pr-9 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted pointer-events-none" />
      </div>
    </div>
  );
}
