import { Zap, Coins } from "lucide-react";
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

  const balance    = quota.creditBalance ?? quota.remaining ?? 0;
  const used       = quota.creditsUsed   ?? quota.used      ?? 0;
  const total      = balance + used;
  const pct        = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const isWarning  = pct >= 80;
  const isCritical = pct >= 95;
  const isEnterprise = quota.accountLabel === "Enterprise";

  return (
    <Card>
      <CardContent className="pt-3 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Coins size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isEnterprise ? "Enterprise Credits" : "Credit Balance"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEnterprise ? "Shared team balance" : "Your personal balance"}
              </p>
            </div>
          </div>
          <Button size="sm" className="gradient-brand border-0 text-white hover:opacity-90 text-xs h-8">
            Get Credits
          </Button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-2xl font-bold tabular-nums">{formatNumber(balance)}</span>
              <span className="text-sm text-muted-foreground ml-1">remaining</span>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatNumber(used)} used
            </span>
          </div>

          {total > 0 && (
            <>
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
                  {pct}% consumed
                </span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatNumber(balance)}</span> available
                </span>
              </div>
            </>
          )}

          {total === 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 flex items-center gap-1.5">
              <Zap size={12} />
              No credits yet. Purchase a plan to get started.
            </div>
          )}
        </div>

        {isEnterprise && (
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <Zap size={12} />
            All members share this balance. Contact your admin to add credits.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
