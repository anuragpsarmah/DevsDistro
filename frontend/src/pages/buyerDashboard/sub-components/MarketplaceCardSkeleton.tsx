import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceCardSkeleton() {
  return (
    <div className="relative h-full">
      <div className="relative h-full bg-white dark:bg-[#050505] border-2 border-neutral-800 dark:border-white flex flex-col shadow-[4px_4px_0_0_rgba(38,38,38,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)]">
        <div className="relative z-10 border-b-2 border-neutral-800 dark:border-white">
          <Skeleton className="w-full h-48 bg-gray-200 dark:bg-gray-800 rounded-none object-cover" />
          <div className="absolute top-3 right-3">
            <Skeleton className="w-16 h-7 rounded-none bg-gray-300 dark:bg-gray-700 border-2 border-neutral-800 dark:border-white shadow-[2px_2px_0_0_rgba(38,38,38,1)] dark:shadow-[2px_2px_0_0_rgba(255,255,255,1)]" />
          </div>
          <div className="absolute top-3 left-3">
            <Skeleton className="w-24 h-6 rounded-none bg-red-200 dark:bg-red-900 border-2 border-neutral-800 dark:border-white shadow-[2px_2px_0_0_rgba(38,38,38,1)] dark:shadow-[2px_2px_0_0_rgba(255,255,255,1)]" />
          </div>
        </div>

        <div className="relative z-10 p-4 lg:p-5 flex flex-col flex-grow bg-white dark:bg-[#050505]">
          <Skeleton className="h-6 w-3/4 bg-gray-300 dark:bg-gray-700 mb-3 rounded-none" />

          <div className="space-y-3 mb-4">
            <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded-none" />
            <Skeleton className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded-none" />
          </div>

          <div className="flex gap-2 mb-4">
            <Skeleton className="h-5 w-14 rounded-none bg-neutral-800/20 dark:bg-white/20" />
            <Skeleton className="h-5 w-18 rounded-none bg-neutral-800/20 dark:bg-white/20" />
            <Skeleton className="h-5 w-12 rounded-none bg-neutral-800/20 dark:bg-white/20" />
          </div>

          <div className="mt-auto flex items-center justify-between pt-4 border-t-2 border-neutral-800 dark:border-white">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-none border-2 border-neutral-800 dark:border-white bg-gray-300 dark:bg-gray-700" />
              <Skeleton className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-none" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-8 h-8 rounded-none border-2 border-neutral-800 dark:border-white bg-gray-300 dark:bg-gray-700" />
              <Skeleton className="h-8 w-16 rounded-none border-2 border-neutral-800 dark:border-white bg-gray-300 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
