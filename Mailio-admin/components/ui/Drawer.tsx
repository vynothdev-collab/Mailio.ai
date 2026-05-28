"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}

const WIDTH = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "md",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className={`relative w-full ${WIDTH[width]} bg-white shadow-xl flex flex-col h-full animate-in slide-in-from-right`}
      >
        <div className="flex items-start justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div>
            {title && <h3 className="text-sm sm:text-base font-semibold text-text-primary">{title}</h3>}
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50">{footer}</div>
        )}
      </aside>
    </div>
  );
}
