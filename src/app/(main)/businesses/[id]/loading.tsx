import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="aspect-[4/3] w-full rounded-3xl sm:aspect-[16/7]" />
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-10 w-2/3" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-9 w-40" />
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
