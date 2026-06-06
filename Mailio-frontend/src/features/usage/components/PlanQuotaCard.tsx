import { Zap, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/src/components/shared/ProgressBar";
import { formatNumber, cn } from "@/src/lib/utils";
import type { UsageQuotaDto } from "@/src/types/usage";

interface Props {
  quota:   UsageQuotaDto | null;
  loading: boolean;
}

function formatPlanLabel(plan: string): string {
  return `${plan.charAt(0)}${plan.slice(1).toLowerCase()} Plan`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PlanQuotaCard({ quota, loading }: Props) {
  if (loading || !quota) {
    return (
      <Card>
        <CardContent className="pt-3 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-16 sm:h-4 sm:w-20" />
                <Skeleton className="h-2.5 w-24 sm:h-3 sm:w-28" />
              </div>
            </div>
            <Skeleton className="h-7 w-20 sm:h-8 sm:w-24 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-end justify-between">
              <Skeleton className="h-7 w-16 sm:h-8 sm:w-20" />
              <Skeleton className="h-3.5 w-24 sm:h-4 sm:w-28" />
            </div>
            <Skeleton className="h-2 w-full sm:h-2.5 rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-12 sm:h-3 sm:w-14" />
              <Skeleton className="h-2.5 w-20 sm:h-3 sm:w-24" />
            </div>
          </div>
          <Skeleton className="h-7 w-full sm:h-8 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const pct        = Math.min(100, Math.round(quota.percentage));
  const remaining  = quota.remaining;
  const isWarning  = pct >= 80;
  const isCritical = pct >= 95;

  return (
    <Card>
      <CardContent className="pt-3 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap size={13} className="text-primary sm:hidden" />
              <Zap size={15} className="text-primary hidden sm:block" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold">{formatPlanLabel(quota.plan)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Current billing period</p>
            </div>
          </div>
          <Button size="sm" className="gradient-brand border-0 text-white hover:opacity-90 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">
            Upgrade Plan
          </Button>
        </div>

        <div className="space-y-1 sm:space-y-1.5">
          <div className="flex items-end justify-between">
            <span className="text-xl sm:text-2xl font-bold tabular-nums">{formatNumber(quota.used)}</span>
            <span className="text-[10px] sm:text-sm text-muted-foreground tabular-nums">
              of {formatNumber(quota.limit)} emails
            </span>
          </div>
          <ProgressBar
            value={pct}
            size="md"
            fillClassName={cn(
              "h-full rounded-full transition-all duration-500",
              isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "gradient-brand",
            )}
          />
          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <span className={cn(
              "font-medium",
              isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-muted-foreground",
            )}>
              {pct}% used
            </span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{formatNumber(remaining)}</span> remaining
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs text-muted-foreground">
          <CalendarClock size={11} className="sm:hidden" />
          <CalendarClock size={13} className="hidden sm:block" />
          Resets on <span className="font-semibold text-foreground ml-0.5">{formatDate(quota.resetDate)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
