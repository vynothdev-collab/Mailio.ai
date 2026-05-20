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
        <CardContent className="pt-3 space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-9 w-full" />
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
      <CardContent className="pt-3 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{formatPlanLabel(quota.plan)}</p>
              <p className="text-xs text-muted-foreground">Current billing period</p>
            </div>
          </div>
          <Button size="sm" className="gradient-brand border-0 text-white hover:opacity-90 text-xs h-8">
            Upgrade Plan
          </Button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold tabular-nums">{formatNumber(quota.used)}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
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
          <div className="flex items-center justify-between text-xs">
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

        <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <CalendarClock size={13} />
          Quota resets on <span className="font-semibold text-foreground ml-0.5">{formatDate(quota.resetDate)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
