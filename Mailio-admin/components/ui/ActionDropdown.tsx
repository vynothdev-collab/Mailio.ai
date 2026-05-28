"use client";

import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface Action {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  actions: Action[];
}

export default function ActionDropdown({ actions }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-lg shadow-lg z-10 py-1">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                action.danger ? "text-red-600" : "text-text-primary"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
