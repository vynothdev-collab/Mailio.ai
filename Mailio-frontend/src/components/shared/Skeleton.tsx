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
