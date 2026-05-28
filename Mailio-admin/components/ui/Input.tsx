import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs sm:text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        className={cn(
          "w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg bg-white text-gray-900 placeholder-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
          "disabled:bg-gray-50 disabled:cursor-not-allowed",
          error ? "border-red-400 focus:ring-red-400" : "border-gray-300",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
