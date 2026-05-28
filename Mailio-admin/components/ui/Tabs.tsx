"use client";

import { ReactNode } from "react";

interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  actions?: ReactNode;
  className?: string;
}

export default function Tabs({ tabs, active, onChange, actions, className = "" }: Props) {
  return (
    <div className={`border-b border-gray-100 flex items-end justify-between gap-2 sm:gap-3 flex-wrap ${className}`}>
      <div className="flex gap-3 sm:gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`relative py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                isActive ? "text-primary-600" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      {actions && <div className="flex items-center gap-2 pb-1.5 sm:pb-2">{actions}</div>}
    </div>
  );
}
