import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Card from "./Card";

type Accent = "blue" | "green" | "purple" | "orange" | "red" | "sky" | "indigo";

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: Accent;
  delta?: number;
  deltaLabel?: string;
  sub?: string;
  className?: string;
}

const ACCENT: Record<Accent, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500", text: "text-blue-600" },
  green: { bg: "bg-emerald-500", text: "text-emerald-600" },
  purple: { bg: "bg-purple-500", text: "text-purple-600" },
  orange: { bg: "bg-orange-500", text: "text-orange-600" },
  red: { bg: "bg-red-500", text: "text-red-600" },
  sky: { bg: "bg-sky-500", text: "text-sky-600" },
  indigo: { bg: "bg-indigo-500", text: "text-indigo-600" },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  delta,
  deltaLabel,
  sub,
  className = "",
}: Props) {
  const colors = ACCENT[accent];
  const isPositive = delta !== undefined && delta >= 0;
  return (
    <Card className={`p-2.5 sm:p-5 ${className}`}>
      <div className="flex items-start gap-2 sm:gap-4">
        {Icon && (
          <div
            className={`w-7 h-7 sm:w-11 sm:h-11 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] sm:text-xs font-medium text-text-muted uppercase tracking-wide truncate leading-tight">
            {label}
          </p>
          <p className="text-base sm:text-2xl font-bold text-text-primary mt-0.5 sm:mt-1 leading-tight">
            {value}
          </p>
          {delta !== undefined && (
            <p
              className={`text-[9px] sm:text-xs font-medium mt-0.5 sm:mt-1 flex items-center gap-0.5 sm:gap-1 ${
                isPositive ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              )}
              {isPositive ? "+" : ""}
              {delta}%
              {deltaLabel && (
                <span className="hidden sm:inline text-text-muted font-normal ml-0.5 truncate">
                  {deltaLabel}
                </span>
              )}
            </p>
          )}
          {sub && !delta && (
            <p className="text-[9px] sm:text-xs text-text-muted mt-0.5 sm:mt-1 truncate">{sub}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
