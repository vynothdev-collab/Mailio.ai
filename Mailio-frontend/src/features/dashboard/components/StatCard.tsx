import { memo } from "react";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { StatItem } from "../types";

const ICON_THEMES: Record<
  string,
  { pillBg: string; innerBg: string; icon: (props: { size?: number }) => React.ReactElement }
> = {
  Mail: {
    pillBg: "bg-[#EEF3FB]",
    innerBg: "bg-[#DCE7FC]",
    icon: ({ size = 12 }) => (
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M9.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V8.5C1.5 9.05228 1.94772 9.5 2.5 9.5H9.5C10.0523 9.5 10.5 9.05228 10.5 8.5V3.5C10.5 2.94772 10.0523 2.5 9.5 2.5Z" stroke="#0F5BFF" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M1.5 3.5L6 6.5L10.5 3.5" stroke="#0F5BFF" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  ShieldCheck: {
    pillBg: "bg-[#EEF3FB]",
    innerBg: "bg-[#D6EFE0]",
    icon: ({ size = 12 }) => (
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 11C6 11 10 9 10 6V2.5L6 1L2 2.5V6C2 9 6 11 6 11Z" stroke="#14A055" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.5 6L5.5 7L7.5 5" stroke="#14A055" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  AlertTriangle: {
    pillBg: "bg-[#EEF3FB]",
    innerBg: "bg-[#FAD7D7]",
    icon: ({ size = 12 }) => (
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 4.5V6.5" stroke="#E03A3A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 8.5H6.005" stroke="#E03A3A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.15 1.93L0.91 9C0.823 9.151 0.776 9.323 0.776 9.497C0.776 9.672 0.821 9.844 0.907 9.995C0.994 10.147 1.118 10.273 1.269 10.362C1.419 10.45 1.59 10.498 1.765 10.5H10.235C10.41 10.498 10.581 10.45 10.731 10.362C10.882 10.273 11.006 10.147 11.093 9.995C11.179 9.844 11.224 9.672 11.224 9.497C11.224 9.323 11.177 9.151 11.09 9L6.85 1.93C6.76 1.785 6.635 1.666 6.486 1.583C6.338 1.5 6.17 1.457 6 1.457C5.83 1.457 5.662 1.5 5.514 1.583C5.365 1.666 5.24 1.785 5.15 1.93Z" stroke="#E03A3A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
};

const CATCHALL_THEME = {
  pillBg: "bg-[#EEF3FB]",
  innerBg: "bg-[#FBE7BF]",
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


const TOOLTIP_BY_LABEL: Record<string, string> = {
  "total verified":
    "Total number of emails verified across single and bulk checks.",
  "valid rate":
    "Percentage of verified emails that are safe to send. These emails passed mailbox, domain checks.",
  "invalid rate":
    "Percentage of verified emails that failed verification.",
  "catchall rate":
    "Percentage of emails that are not fully invalid but may be catchall.",
};


function tooltipFor(label: string): string {
  return (
    TOOLTIP_BY_LABEL[label.toLowerCase()] ??
    `${label} for the selected period.`
  );
}

export const StatCard = memo(({ stat }: StatCardProps) => {
  const isCatchallCard = stat.label.toLowerCase().includes("catchall");
  const theme = isCatchallCard ? CATCHALL_THEME : (ICON_THEMES[stat.iconName] ?? ICON_THEMES.Mail);
  const Icon = theme.icon;

  const isUp = stat.change > 0;
  const isDown = stat.change < 0;
  const showChange = stat.change !== 0 || !!stat.changePeriod;
  const tooltip = tooltipFor(stat.label);

  return (
    <div className="rounded-2xl border border-[#DCE6F3] bg-white p-2.5 sm:p-4 lg:p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[9px] font-semibold uppercase tracking-wider text-[#8B847A] sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-5 sm:text-xs",
            theme.pillBg,
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full sm:h-7 sm:w-7",
              theme.innerBg,
            )}
          >
            <Icon size={12} />
          </span>
          {stat.label}
        </span>
        <div className="group relative">
          <button
            type="button"
            aria-label={`What is ${stat.label}?`}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#8B847A] hover:bg-[#F4F8FF] hover:text-[#161514] transition-colors sm:h-7 sm:w-7"
          >
            <Info size={11} strokeWidth={1.5} className="sm:hidden" />
            <Info size={13} strokeWidth={1.5} className="hidden sm:block" />
          </button>
          <div
            role="tooltip"
            className="pointer-events-none absolute right-0 bottom-full z-30 mb-2.5 w-52 -translate-y-1 rounded-lg bg-[#111827] px-3 py-2 text-[11px] leading-relaxed text-white opacity-0 shadow-xl transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <span
              aria-hidden
              className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 bg-[#111827]"
            />
            {tooltip}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[20px] font-bold tabular-nums leading-tight tracking-tight text-[#111827] sm:mt-3 sm:text-[26px] md:text-[28px]">
        {stat.value}
      </p>
    </div>
  );
});
StatCard.displayName = "StatCard";
