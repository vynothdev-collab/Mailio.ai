import type { StatItem } from "../types";
import { StatCard } from "./StatCard";
import { StatCardSkeleton } from "@/src/components/shared/Skeleton";

interface StatsGridProps {
  stats:   StatItem[];
  loading: boolean;
}

export function StatsGrid({ stats, loading }: StatsGridProps) {
  return (
    <section aria-label="Dashboard statistics">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </div>
    </section>
  );
}
