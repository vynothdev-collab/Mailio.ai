import { memo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Mail, ShieldCheck, AlertTriangle, Database, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import type { StatItem } from "../types";

const ICON_MAP: Record<string, React.ElementType> = {
  Mail, ShieldCheck, AlertTriangle, Database, BarChart3,
};

interface StatCardProps {
  stat: StatItem;
}

export const StatCard = memo(({ stat }: StatCardProps) => {
  const Icon     = ICON_MAP[stat.iconName] ?? Mail;
  const isUp     = stat.change > 0;
  const isNeutral = stat.change === 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-tight">
              {stat.value}
            </p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              stat.iconBgColor
            )}
            aria-hidden
          >
            <Icon size={20} className={cn(stat.iconColor)} />
          </div>
        </div>

        {stat.changePeriod && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className={cn(
              "text-xs font-semibold",
              isNeutral ? "text-muted-foreground" : isUp ? "text-emerald-600" : "text-red-500"
            )}>
              {stat.change > 0 ? "+" : ""}{stat.change}%
            </span>

            <span className="text-xs text-muted-foreground truncate flex-1">
              {stat.changePeriod}
            </span>

            {isNeutral ? (
              <Minus size={13} className="text-muted-foreground shrink-0" />
            ) : isUp ? (
              <TrendingUp size={13} className="text-emerald-500 shrink-0" />
            ) : (
              <TrendingDown size={13} className="text-red-500 shrink-0" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
StatCard.displayName = "StatCard";
