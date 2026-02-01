import { Skeleton } from "@/components/ui/skeleton";

export const DashboardCardSkeleton = () => (
  <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.05] to-purple-600/[0.05] pointer-events-none" />
    <div className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
      <Skeleton className="h-4 w-24 bg-gray-700/50" />
      <Skeleton className="h-4 w-4 bg-gray-700/50 rounded-full" />
    </div>
    <div className="relative z-10 mt-2">
      <Skeleton className="h-8 w-32 bg-gray-700/50 mb-1" />
      <Skeleton className="h-3 w-20 bg-gray-700/50" />
    </div>
  </div>
);

export const MetricCardSkeleton = () => (
  <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.05] to-purple-600/[0.05] pointer-events-none" />
    <div className="relative z-10">
      <Skeleton className="h-5 w-24 mb-3 bg-gray-700/50" />
      <Skeleton className="h-8 w-32 bg-gray-700/50" />
    </div>
  </div>
);

export const SalesMetricsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
    {[...Array(4)].map((_, index) => (
      <DashboardCardSkeleton key={index} />
    ))}
  </div>
);

export const MonthlySalesHeaderSkeleton = () => (
  <div className="flex items-center gap-2.5">
    <Skeleton className="w-8 h-8 rounded-lg bg-gray-700/50" />
    <div className="space-y-1.5">
      <Skeleton className="h-6 w-32 bg-gray-700/50" />
      <Skeleton className="h-3 w-48 bg-gray-700/50 hidden sm:block" />
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="flex flex-col h-full">
    <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-2xl rounded-3xl pointer-events-none" />
        <div className="relative h-full bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-4 lg:p-5">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />
             <div className="flex items-end justify-between h-full gap-2 pt-4">
                  {[...Array(12)].map((_, i) => (
                      <Skeleton key={i} className="w-full bg-gray-700/30 rounded-t-sm" style={{ height: `${Math.random() * 60 + 30}%` }} />
                  ))}
             </div>
        </div>
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6">
    <div className="flex-shrink-0 mb-4 lg:mb-5">
        <div className="flex items-center gap-3 mb-1">
             <Skeleton className="w-10 h-10 rounded-xl bg-gray-700/50" />
             <div className="space-y-2">
                 <Skeleton className="h-8 w-48 bg-gray-700/50" />
                 <Skeleton className="h-4 w-32 bg-gray-700/50" />
             </div>
        </div>
    </div>
    
    <div className="flex-shrink-0 mb-4 lg:mb-5">
        <SalesMetricsSkeleton />
    </div>
    
    <div className="flex-1 min-h-0">
        <ChartSkeleton />
    </div>
  </div>
);

export const ProfileHeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 mb-8">
    <div className="relative">
      <Skeleton className="w-32 h-32 md:w-36 md:h-36 rounded-2xl bg-gray-700/50" />
    </div>
    <div className="flex-1 text-center md:text-left space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-gray-700/50 mx-auto md:mx-0" />
        <Skeleton className="h-4 w-32 bg-gray-700/50 mx-auto md:mx-0" />
      </div>
       <div className="flex flex-wrap justify-center md:justify-start gap-3">
          <Skeleton className="h-6 w-24 rounded-full bg-gray-700/50" />
          <Skeleton className="h-6 w-24 rounded-full bg-gray-700/50" />
       </div>
    </div>
  </div>
);

export const FormFieldSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-24 bg-gray-700/50" />
    <Skeleton className="h-10 w-full rounded-xl bg-gray-700/30" />
  </div>
);

export const ReviewSectionSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-4 w-32 bg-gray-700/50" />
      <Skeleton className="h-32 w-full rounded-xl bg-gray-700/30" />
      <div className="flex justify-end">
          <Skeleton className="h-4 w-16 bg-gray-700/50" />
      </div>
    </div>
    <div className="space-y-4">
      <Skeleton className="h-4 w-24 bg-gray-700/50" />
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Skeleton key={star} className="w-8 h-8 rounded-lg bg-gray-700/50" />
        ))}
      </div>
    </div>
  </div>
);

export const RepoImportSkeleton = () => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
    <div className="flex items-center space-x-3">
      <Skeleton className="w-8 h-8 rounded-lg bg-gray-700/40" />
      <div className="space-y-2">
        <Skeleton className="w-32 h-4 bg-gray-700/40 rounded" />
        <Skeleton className="w-20 h-3 bg-gray-700/30 rounded" />
      </div>
    </div>
    <Skeleton className="w-16 h-8 bg-gray-700/40 rounded-lg" />
  </div>
);
