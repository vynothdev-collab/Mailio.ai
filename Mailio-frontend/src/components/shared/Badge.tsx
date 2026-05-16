// Status badge built on top of shadcn's Badge primitive.
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/src/features/dashboard/constants";
import { cn } from "@/src/lib/utils";
import type { VerificationStatus } from "@/src/features/dashboard/types";

interface StatusBadgeProps {
  status: VerificationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, dotColor, className: statusClass } = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full border font-medium",
        statusClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      {label}
    </Badge>
  );
}

// Re-export base Badge for generic use
export { Badge };
