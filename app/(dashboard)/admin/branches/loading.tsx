import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBranchesLoading() {
  return (
    <div className="flex w-full flex-col gap-6 py-4">
      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <Skeleton className="h-9 max-w-sm" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-[min(28rem,60vh)] w-full rounded-lg border" />
      </div>
      <div className="flex justify-between px-4 lg:px-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  );
}
