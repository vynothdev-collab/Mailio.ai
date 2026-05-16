// Re-export shadcn's cn (clsx + tailwind-merge) so all src/ imports still work
export { cn } from "@/lib/utils";

/** Format seconds → "Xm Ys" */
export function formatEta(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Format large numbers with locale commas */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
