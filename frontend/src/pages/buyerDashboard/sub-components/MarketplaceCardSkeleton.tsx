import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceCardSkeleton() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-xl rounded-2xl pointer-events-none" />
      <div className="relative bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col h-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />

        <div className="relative z-10">
          <Skeleton className="w-full h-48 bg-gray-700/50 rounded-none" />
          <div className="absolute top-3 right-3">
            <Skeleton className="w-16 h-7 rounded-lg bg-gray-800/80" />
          </div>
          <div className="absolute top-3 left-3">
            <Skeleton className="w-24 h-6 rounded-lg bg-gray-800/80" />
          </div>
        </div>

        <div className="relative z-10 p-4 lg:p-5 flex flex-col flex-grow">
          <Skeleton className="h-5 w-3/4 bg-gray-700/50 mb-3" />

          <div className="space-y-2 mb-4">
            <Skeleton className="h-3.5 w-full bg-gray-700/40" />
            <Skeleton className="h-3.5 w-5/6 bg-gray-700/40" />
          </div>

          <div className="flex gap-1.5 mb-4">
            <Skeleton className="h-5 w-14 rounded-full bg-gray-700/40" />
            <Skeleton className="h-5 w-18 rounded-full bg-gray-700/40" />
            <Skeleton className="h-5 w-12 rounded-full bg-gray-700/40" />
          </div>

          <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full bg-gray-700/50" />
              <Skeleton className="h-3 w-20 bg-gray-700/40" />
            </div>
            <Skeleton className="h-3.5 w-12 bg-gray-700/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
