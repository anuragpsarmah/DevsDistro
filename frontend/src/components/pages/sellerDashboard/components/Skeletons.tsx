import { Skeleton } from "@/components/ui/skeleton";

export const MetricCardSkeleton = () => (
  <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
    <Skeleton className="h-5 w-24 mb-2 bg-gray-700" />
    <Skeleton className="h-8 w-32 bg-gray-700" />
  </div>
);

export const SalesMetricsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[...Array(4)].map((_, index) => (
      <MetricCardSkeleton key={index} />
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
    <div className="flex justify-between items-center mb-10">
      <Skeleton className="h-8 w-48 bg-gray-700" />
      <Skeleton className="h-10 w-[100px] bg-gray-700" />
    </div>
    <Skeleton className="h-[400px] w-full bg-gray-700" />
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
    <Skeleton className="h-12 w-72 mb-6 bg-gray-700" />
    <SalesMetricsSkeleton />
    <ChartSkeleton />
  </div>
);