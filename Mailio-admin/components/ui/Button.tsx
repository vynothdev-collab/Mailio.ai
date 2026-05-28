import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "brand" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
  brand: "bg-brand text-white hover:bg-brand-hover focus:ring-brand/40",
  secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-300",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs",
  md: "px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm",
  lg: "px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
