// Gradient progress bar using @base-ui/react/progress primitives.
// shadcn's Progress is also re-exported for standard (non-gradient) use cases.
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@/src/lib/utils";

export { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";

interface ProgressBarProps {
  value: number;          // 0–100
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  size?: "xs" | "sm" | "md";
}

const sizeMap = { xs: "h-1", sm: "h-1.5", md: "h-2.5" };

/** Gradient progress bar that plugs into base-ui's accessible Root context. */
export function ProgressBar({
  value,
  className,
  trackClassName,
  fillClassName,
  size = "sm",
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <ProgressPrimitive.Root
      value={clamped}
      className={cn("w-full", className)}
      aria-label="Verification progress"
    >
      <ProgressPrimitive.Track
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-slate-100",
          sizeMap[size],
          trackClassName
        )}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full rounded-full transition-all duration-500",
            fillClassName ?? "gradient-brand"
          )}
          style={{ width: `${clamped}%` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
