import { memo } from "react";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { StatItem } from "../types";

const ICON_THEMES: Record<
  string,
  { pillBg: string; icon: (props: { size?: number }) => React.ReactElement }
> = {
  Mail: {
    pillBg: "bg-[#E6EEFB]",
    icon: ({ size = 12 }) => (
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M9.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V8.5C1.5 9.05228 1.94772 9.5 2.5 9.5H9.5C10.0523 9.5 10.5 9.05228 10.5 8.5V3.5C10.5 2.94772 10.0523 2.5 9.5 2.5Z" stroke="#0F5BFF" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M1.5 3.5L6 6.5L10.5 3.5" stroke="#0F5BFF" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  ShieldCheck: {
    pillBg: "bg-[#E2F4EA]",
    icon: ({ size = 12 }) => (
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 11C6 11 10 9 10 6V2.5L6 1L2 2.5V6C2 9 6 11 6 11Z" stroke="#14A055" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.5 6L5.5 7L7.5 5" stroke="#14A055" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  AlertTriangle: {
    pillBg: "bg-[#FCE6E6]",
    icon: ({ size = 12 }) => (
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 4.5V6.5" stroke="#E03A3A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 8.5H6.005" stroke="#E03A3A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.15 1.93L0.91 9C0.823 9.151 0.776 9.323 0.776 9.497C0.776 9.672 0.821 9.844 0.907 9.995C0.994 10.147 1.118 10.273 1.269 10.362C1.419 10.45 1.59 10.498 1.765 10.5H10.235C10.41 10.498 10.581 10.45 10.731 10.362C10.882 10.273 11.006 10.147 11.093 9.995C11.179 9.844 11.224 9.672 11.224 9.497C11.224 9.323 11.177 9.151 11.09 9L6.85 1.93C6.76 1.785 6.635 1.666 6.486 1.583C6.338 1.5 6.17 1.457 6 1.457C5.83 1.457 5.662 1.5 5.514 1.583C5.365 1.666 5.24 1.785 5.15 1.93Z" stroke="#E03A3A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
};

const RISK_THEME = {
  pillBg: "bg-[#FDEFD3]",
  icon: ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 4.5V6.5" stroke="#E89B1A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 8.5H6.005" stroke="#E89B1A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.15 1.93L0.91 9C0.823 9.151 0.776 9.323 0.776 9.497C0.776 9.672 0.821 9.844 0.907 9.995C0.994 10.147 1.118 10.273 1.269 10.362C1.419 10.45 1.59 10.498 1.765 10.5H10.235C10.41 10.498 10.581 10.45 10.731 10.362C10.882 10.273 11.006 10.147 11.093 9.995C11.179 9.844 11.224 9.672 11.224 9.497C11.224 9.323 11.177 9.151 11.09 9L6.85 1.93C6.76 1.785 6.635 1.666 6.486 1.583C6.338 1.5 6.17 1.457 6 1.457C5.83 1.457 5.662 1.5 5.514 1.583C5.365 1.666 5.24 1.785 5.15 1.93Z" stroke="#E89B1A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

interface StatCardProps {
  stat: StatItem;
}

export const StatCard = memo(({ stat }: StatCardProps) => {
  const isRiskCard = stat.label.toLowerCase().includes("risk");
  const theme = isRiskCard ? RISK_THEME : (ICON_THEMES[stat.iconName] ?? ICON_THEMES.Mail);
  const Icon = theme.icon;

  const isUp = stat.change > 0;
  const isDown = stat.change < 0;
  const showChange = stat.change !== 0 || !!stat.changePeriod;

  return (
    <div className="rounded-2xl border border-[#DCE6F3] bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#161514]",
            theme.pillBg,
          )}
        >
          <Icon size={12} />
          {stat.label}
        </span>
        <Info size={14} className="text-muted-foreground" />
      </div>

      <p className="mt-4 text-4xl font-bold tabular-nums leading-none text-[#111827]">
        {stat.value}
      </p>

      {showChange && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              isUp && "bg-emerald-50 text-emerald-700",
              isDown && "bg-red-50 text-red-600",
              !isUp && !isDown && "bg-muted text-muted-foreground",
            )}
          >
            {isUp && <TrendingUp size={10} />}
            {isDown && <TrendingDown size={10} />}
            {stat.change > 0 ? "+" : ""}
            {stat.change}%
          </span>
          {stat.changePeriod && (
            <span className="text-xs text-muted-foreground truncate">
              {stat.changePeriod}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
StatCard.displayName = "StatCard";
