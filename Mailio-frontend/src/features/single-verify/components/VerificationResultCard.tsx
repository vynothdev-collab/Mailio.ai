import { ShieldCheck, ShieldX, ShieldQuestion, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { EMAIL_STATUS_CONFIG } from "../constants";
import type { EmailStatus, VerificationResult } from "../types";

interface VerificationResultCardProps {
  result: VerificationResult;
}

const STATUS_ICON: Record<EmailStatus, { Icon: typeof ShieldCheck; bg: string; color: string }> = {
  valid:      { Icon: ShieldCheck,    bg: "bg-emerald-50", color: "text-emerald-600" },
  invalid:    { Icon: ShieldX,        bg: "bg-red-50",     color: "text-red-500"     },
  risky:      { Icon: ShieldX,        bg: "bg-amber-50",   color: "text-amber-600"   },
  disposable: { Icon: ShieldX,        bg: "bg-violet-50",  color: "text-violet-600"  },
  unknown:    { Icon: ShieldQuestion, bg: "bg-slate-50",   color: "text-slate-500"   },
};

export function VerificationResultCard({ result }: VerificationResultCardProps) {
  const { email, status, description, verifiedAt, durationMs } = result;
  const statusCfg  = EMAIL_STATUS_CONFIG[status];
  const iconCfg    = STATUS_ICON[status];
  const { Icon }   = iconCfg;

  return (
    <Card>
      <CardContent className="pt-2 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Verification Result</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Completed
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={11} />
            Verified in {(durationMs / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Result body */}
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              iconCfg.bg,
            )}>
              <Icon size={24} className={cn(iconCfg.color)} />
            </div>

            <div className="space-y-1.5">
              <p className="text-base font-semibold text-foreground">{email}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  statusCfg.className,
                )}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
              <p className="text-xs text-muted-foreground">Verified on {verifiedAt}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
