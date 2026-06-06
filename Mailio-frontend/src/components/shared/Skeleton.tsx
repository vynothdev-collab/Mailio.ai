export { Skeleton } from "@/components/ui/skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#DCE6F3] bg-white p-2.5 sm:p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full sm:h-7 sm:w-32" />
        <Skeleton className="h-5 w-5 rounded-full sm:h-7 sm:w-7" />
      </div>
      <Skeleton className="mt-2 h-6 w-16 sm:mt-3 sm:h-8 sm:w-24 lg:h-10 lg:w-28" />
      <Skeleton className="mt-2 h-3 w-24 sm:mt-3 sm:h-4 sm:w-40" />
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
    </div>
  );
}

function CardBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#DCE6F3] bg-white p-3 space-y-3 sm:p-4 lg:p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-full" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-[#DCE6F3] bg-white">
      <div className="flex items-start justify-between gap-3 px-3 py-3 sm:px-5 sm:py-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-9 w-56 rounded-full" />
      </div>
      <div className="px-3 pb-3 sm:px-5 sm:pb-4">
        <Skeleton className="h-9 w-64 rounded-full" />
      </div>
      <div className="border-t border-[#DCE6F3]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[#DCE6F3]/60 px-3 py-3 sm:px-5 last:border-0"
          >
            <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="hidden h-4 w-28 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStatSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#DCE6F3] bg-white p-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}

export function BulkVerifyContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <MiniStatSkeleton key={i} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <CardBlock />
          <TableSkeleton />
        </div>
        <div className="space-y-4">
          <CardBlock />
        </div>
      </div>
    </div>
  );
}

export function BulkVerifySkeleton() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton />
      <BulkVerifyContentSkeleton />
    </div>
  );
}

export function SingleVerifyContentSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <CardBlock />
        <TableSkeleton />
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#DCE6F3] bg-white p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-[#F4F8FF] p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                </div>
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function SingleVerifySkeleton() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton />
      <SingleVerifyContentSkeleton />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#DCE6F3] space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
        <div className="rounded-xl bg-[#F4F8FF] px-4 py-4 flex items-center gap-3">
          <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex items-center justify-between pt-1 border-t border-[#DCE6F3]">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <ProfileSkeleton />
      {/* Password & Security card */}
      <div className="rounded-2xl border border-[#DCE6F3] bg-white shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#DCE6F3] space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
            </div>
          ))}
          <div className="flex justify-end pt-1 border-t border-[#DCE6F3]">
            <Skeleton className="h-9 w-44 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardContentSkeleton() {
  return (
    <div className="space-y-4 md:space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        <CardBlock />
        <CardBlock />
        <div className="md:col-span-2 lg:col-span-1">
          <CardBlock />
        </div>
      </div>

      <TableSkeleton />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 md:space-y-5">
      <HeaderSkeleton />
      <DashboardContentSkeleton />
    </div>
  );
}

export function ResultsContentSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2 sm:gap-3 rounded-xl border border-[#DCE6F3] bg-white p-2.5 sm:p-3">
            <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
              <Skeleton className="h-2.5 w-12 sm:h-3 sm:w-16" />
              <Skeleton className="h-4 w-10 sm:h-6 sm:w-14" />
              <Skeleton className="h-2 w-14 sm:h-2.5 sm:w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Card: filters + table + pagination */}
      <div className="rounded-xl border border-[#DCE6F3] bg-white p-2 sm:p-6 space-y-2 sm:space-y-3">

        {/* Filters: search + type toggle */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-8 sm:h-9 w-full sm:w-56 rounded-lg" />
          <div className="flex items-center gap-0.5 rounded-lg border border-[#DCE6F3] bg-muted/30 p-0.5 sm:p-1 self-start sm:self-auto">
            {["All", "Single", "Bulk"].map((l) => (
              <Skeleton key={l} className="h-5 w-9 sm:h-6 sm:w-12 rounded-md" />
            ))}
          </div>
        </div>

        {/* Table using real <table> so columns align perfectly */}
        <div className="overflow-hidden rounded-lg border border-[#DCE6F3]">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#DCE6F3] bg-muted/40">
                <th className="px-2 py-2 sm:px-3 text-left w-[45%]">
                  <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-20 rounded" />
                </th>
                <th className="px-2 py-2 sm:px-3 text-left w-[15%]">
                  <Skeleton className="h-2.5 sm:h-3 w-8 sm:w-10 rounded" />
                </th>
                <th className="hidden sm:table-cell px-2 py-2 sm:px-3 text-left w-[20%]">
                  <Skeleton className="h-3 w-16 sm:w-20 rounded" />
                </th>
                <th className="hidden sm:table-cell px-2 py-2 sm:px-3 text-left w-[10%]">
                  <Skeleton className="h-3 w-6 sm:w-8 rounded" />
                </th>
                <th className="px-2 py-2 sm:px-3 text-left w-[10%]">
                  <Skeleton className="h-2.5 sm:h-3 w-10 sm:w-14 rounded" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} className="border-b border-[#DCE6F3]/60 last:border-0">
                  {/* Email / File */}
                  <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 rounded" />
                      <Skeleton className="h-3 sm:h-4 w-28 sm:w-44 rounded" />
                    </div>
                  </td>
                  {/* Type */}
                  <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                    <Skeleton className="h-4 sm:h-5 w-10 sm:w-14 rounded-md" />
                  </td>
                  {/* Verified At */}
                  <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-2.5">
                    <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-32 rounded" />
                  </td>
                  {/* View */}
                  <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-2.5">
                    <Skeleton className="h-5 w-14 sm:w-16 rounded-full" />
                  </td>
                  {/* Actions */}
                  <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                    <Skeleton className="h-4 sm:h-5 w-14 sm:w-20 rounded-md" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — matches "Showing X–Y of Z jobs | Prev  Page N/T  Next" layout */}
        <div className="flex items-center justify-between gap-2 border border-[#DCE6F3] rounded-lg px-3 py-2 sm:px-4 sm:py-2.5">
          <Skeleton className="h-3 w-32 sm:h-3.5 sm:w-44 rounded" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Skeleton className="h-7 sm:h-8 w-14 sm:w-16 rounded-md" />
            <Skeleton className="h-3 w-14 sm:w-20 rounded" />
            <Skeleton className="h-7 sm:h-8 w-14 sm:w-16 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsageContentSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Quota card + Breakdown tiles — mirrors UsageView grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* PlanQuotaCard */}
        <div className="lg:col-span-1 rounded-xl border border-[#DCE6F3] bg-white p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-14 sm:h-4 sm:w-20" />
                <Skeleton className="h-2.5 w-20 sm:h-3 sm:w-28" />
              </div>
            </div>
            <Skeleton className="h-7 w-18 sm:h-8 sm:w-24 rounded-lg" />
          </div>
          <div className="space-y-1 sm:space-y-1.5">
            <div className="flex items-end justify-between">
              <Skeleton className="h-6 w-14 sm:h-8 sm:w-20" />
              <Skeleton className="h-3 w-20 sm:h-4 sm:w-28" />
            </div>
            <Skeleton className="h-2 sm:h-2.5 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-10 sm:h-3 sm:w-14" />
              <Skeleton className="h-2.5 w-16 sm:h-3 sm:w-24" />
            </div>
          </div>
          <Skeleton className="h-7 sm:h-8 w-full rounded-lg" />
        </div>

        {/* UsageBreakdownTiles */}
        <div className="lg:col-span-2 flex flex-col justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2 sm:gap-3 rounded-xl border border-[#DCE6F3] bg-white p-3 sm:p-4">
                <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
                  <Skeleton className="h-2.5 w-24 sm:h-3 sm:w-32" />
                  <Skeleton className="h-5 w-14 sm:h-6 sm:w-20" />
                  <div className="space-y-1 pt-0.5">
                    <Skeleton className="h-1 sm:h-1.5 w-full rounded-full" />
                    <Skeleton className="h-2 w-16 sm:h-2.5 sm:w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UsageChart */}
      <div className="rounded-xl border border-[#DCE6F3] bg-white p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="space-y-0.5 sm:space-y-1">
          <Skeleton className="h-3 w-24 sm:h-4 sm:w-32" />
          <Skeleton className="h-2.5 w-36 sm:h-3 sm:w-48" />
        </div>
        <Skeleton className="h-44 sm:h-56 md:h-64 w-full rounded-xl" />
      </div>

      {/* UsageLogTable */}
      <div className="rounded-xl border border-[#DCE6F3] bg-white p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5 sm:space-y-1">
            <Skeleton className="h-3 w-16 sm:h-4 sm:w-20" />
            <Skeleton className="h-2.5 w-28 sm:h-3 sm:w-40" />
          </div>
          <div className="flex gap-0.5 sm:gap-1 rounded-lg border border-[#DCE6F3] p-0.5 sm:p-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-9 sm:h-6 sm:w-12 rounded-md" />
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-[#DCE6F3] overflow-hidden">
          {/* Header row */}
          <div className="flex items-center border-b border-[#DCE6F3] bg-muted/40 px-2 sm:px-3 py-1.5 sm:py-2 gap-3 sm:gap-6">
            <Skeleton className="h-2.5 sm:h-3 w-24 sm:w-36 shrink-0 rounded" />
            <Skeleton className="h-2.5 sm:h-3 w-8 sm:w-12 shrink-0 rounded" />
            <Skeleton className="h-2.5 sm:h-3 w-10 sm:w-14 shrink-0 rounded" />
            <Skeleton className="hidden sm:block h-3 w-20 shrink-0 rounded" />
          </div>
          {/* Rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center border-b border-[#DCE6F3]/60 px-2 sm:px-3 py-2 sm:py-2.5 last:border-0 gap-3 sm:gap-6">
              <div className="flex items-center gap-1.5 sm:gap-2" style={{ minWidth: 100 }}>
                <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 rounded" />
                <Skeleton className="h-3 w-24 sm:h-4 sm:w-36" />
              </div>
              <Skeleton className="h-4 w-10 sm:h-5 sm:w-14 shrink-0 rounded-md" />
              <Skeleton className="h-3 w-8 sm:h-4 sm:w-12 shrink-0" />
              <Skeleton className="hidden sm:block h-3.5 w-20 sm:h-4 sm:w-28 shrink-0" />
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-16 sm:h-4 sm:w-24" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-6 w-10 sm:h-7 sm:w-14 rounded-md" />
            <Skeleton className="h-2.5 w-10 sm:h-3 sm:w-14" />
            <Skeleton className="h-6 w-10 sm:h-7 sm:w-14 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
