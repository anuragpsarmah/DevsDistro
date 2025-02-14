import { Skeleton } from "@/components/ui/skeleton";

export const DashboardCardSkeleton = () => (
  <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
    <Skeleton className="h-5 w-24 mb-2 bg-gray-700" />
    <Skeleton className="h-8 w-32 bg-gray-700" />
  </div>
);

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

export const ProfileHeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row items-center md:items-start mb-8">
    <div className="relative mb-6 md:mb-0 md:mr-8">
      <Skeleton className="w-40 h-40 rounded-full bg-gray-700" />
    </div>
    <div className="text-center md:text-left space-y-4">
      <Skeleton className="h-8 w-48 bg-gray-700" />
      <Skeleton className="h-4 w-36 bg-gray-700" />
      <Skeleton className="h-4 w-32 bg-gray-700" />
    </div>
  </div>
);

export const FormFieldSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-24 bg-gray-700" />
    <Skeleton className="h-10 w-full bg-gray-700" />
  </div>
);

export const ReviewSectionSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-4 w-32 bg-gray-700" />
      <Skeleton className="h-32 w-full bg-gray-700" />
      <Skeleton className="h-4 w-24 bg-gray-700" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-32 bg-gray-700" />
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Skeleton key={star} className="w-8 h-8 bg-gray-700" />
        ))}
      </div>
    </div>
  </div>
);

export const RepoImportSkeleton = () => (
  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700 animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 rounded-lg bg-gray-600" />
      <div className="space-y-2">
        <div className="w-24 h-4 bg-gray-600 rounded-md" />
        <div className="w-32 h-3 bg-gray-600 rounded-md" />
      </div>
    </div>
    <div className="w-24 h-8 bg-gray-600 rounded-md" />
  </div>
);
