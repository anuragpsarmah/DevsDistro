import { Skeleton } from "@/components/ui/skeleton";

export const DashboardCardSkeleton = () => (
  <div className="bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-6 lg:p-8 flex flex-col justify-between overflow-hidden relative">
    <div className="relative z-10 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-[2px] bg-red-500/50"></div>
        <Skeleton className="h-3 w-24 bg-black/10 dark:bg-white/10 rounded-none" />
      </div>
      <Skeleton className="h-10 lg:h-12 w-32 bg-black/10 dark:bg-white/10 rounded-none" />
    </div>
  </div>
);

export const SalesMetricsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
    {[...Array(4)].map((_, index) => (
      <DashboardCardSkeleton key={index} />
    ))}
  </div>
);

export const MonthlySalesHeaderSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <div className="w-12 h-[2px] bg-red-500/50"></div>
      <Skeleton className="h-3 w-24 bg-black/10 dark:bg-white/10 rounded-none" />
    </div>
    <Skeleton className="h-10 lg:h-12 w-48 lg:w-64 bg-black/10 dark:bg-white/10 rounded-none" />
  </div>
);

export const ChartSkeleton = () => (
  <div className="flex items-end justify-between h-full gap-2 pt-4">
    {[...Array(12)].map((_, i) => (
      <Skeleton
        key={i}
        className="w-full bg-black/10 dark:bg-white/10 rounded-none"
        style={{ height: `${Math.random() * 60 + 30}%` }}
      />
    ))}
  </div>
);

export const ProfileHeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row items-center md:items-start mb-12">
    <div className="mb-6 md:mb-0 md:mr-10 shrink-0">
      <div className="w-32 h-32 md:w-48 md:h-48 border-2 border-black dark:border-white p-2">
        <Skeleton className="w-full h-full rounded-none bg-black/10 dark:bg-white/10" />
      </div>
    </div>
    <div className="text-center md:text-left flex-1 max-w-2xl py-2 w-full">
      <Skeleton className="h-12 w-3/4 max-w-sm bg-black/10 dark:bg-white/10 mx-auto md:mx-0 rounded-none mb-6" />
      <div className="space-y-4 w-full flex flex-col items-center md:items-start">
        <div className="flex items-center gap-3">
          <span className="text-red-500 opacity-50 font-bold font-space">
            /
          </span>
          <Skeleton className="w-4 h-4 rounded-none bg-black/10 dark:bg-white/10" />
          <Skeleton className="h-3 w-32 rounded-none bg-black/10 dark:bg-white/10" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-red-500 opacity-50 font-bold font-space">
            /
          </span>
          <Skeleton className="w-4 h-4 rounded-none bg-black/10 dark:bg-white/10" />
          <Skeleton className="h-3 w-40 rounded-none bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    </div>
  </div>
);

export const FormFieldSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-3 w-24 bg-black/10 dark:bg-white/10 rounded-none" />
    <Skeleton className="h-14 w-full rounded-none bg-black/5 dark:bg-white/5 border-2 border-black/10 dark:border-white/10" />
  </div>
);

export const ReviewSectionSkeleton = () => (
  <div className="space-y-8 p-6 lg:p-10 border-2 border-black/10 dark:border-white/10">
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-[2px] bg-red-500"></div>
        <Skeleton className="h-3 w-32 bg-black/10 dark:bg-white/10 rounded-none" />
      </div>
      <Skeleton className="h-40 w-full rounded-none bg-transparent border-2 border-black/20 dark:border-white/20" />
      <div className="flex justify-between items-center mt-3">
        <Skeleton className="h-3 w-48 bg-black/10 dark:bg-white/10 rounded-none" />
        <Skeleton className="h-3 w-12 bg-black/10 dark:bg-white/10 rounded-none" />
      </div>
    </div>
    <div className="border-t-2 border-black/10 dark:border-white/10 pt-8 mt-2">
      <Skeleton className="h-3 w-32 bg-black/10 dark:bg-white/10 rounded-none mb-4" />
      <div className="flex items-center space-x-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <Skeleton
            key={star}
            className="w-10 h-10 rounded-none bg-black/10 dark:bg-white/10"
          />
        ))}
      </div>
    </div>
  </div>
);

export const RepoImportSkeleton = () => (
  <div className="flex items-center justify-between p-6 border-b-2 border-black/10 dark:border-white/10 bg-transparent transition-colors duration-300">
    <div className="flex items-center space-x-4">
      <Skeleton className="w-10 h-10 rounded-none bg-black/10 dark:bg-white/10" />
      <div className="space-y-3">
        <Skeleton className="w-40 h-5 bg-black/10 dark:bg-white/10 rounded-none" />
        <Skeleton className="w-24 h-3 bg-black/10 dark:bg-white/10 rounded-none" />
      </div>
    </div>
    <Skeleton className="w-24 h-12 bg-black dark:bg-white rounded-none border-2 border-transparent" />
  </div>
);

export const ListedProjectSkeleton = () => (
  <div className="relative group bg-white dark:bg-[#050505] border-2 border-black dark:border-white p-4 lg:p-6 flex flex-col h-full overflow-hidden transition-colors duration-300">
    <div className="relative z-10 flex flex-col h-full">
      <div className="relative mb-6 border-2 border-black dark:border-white">
        <Skeleton className="w-full h-48 rounded-none bg-black/5 dark:bg-white/5" />
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t-2 border-black dark:border-white">
          <Skeleton className="h-4 w-3/4 bg-black/10 dark:bg-white/10 rounded-none" />
        </div>
      </div>
      <div className="flex flex-col flex-grow space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-full bg-black/10 dark:bg-white/10 rounded-none" />
          <Skeleton className="h-4 w-11/12 bg-black/10 dark:bg-white/10 rounded-none" />
          <Skeleton className="h-4 w-2/3 bg-black/10 dark:bg-white/10 rounded-none" />
        </div>
        <div className="mt-auto flex gap-3 pt-4 border-t-2 border-black/10 dark:border-white/10">
          <Skeleton className="h-6 w-16 rounded-none border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5" />
          <Skeleton className="h-6 w-20 rounded-none border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5" />
          <Skeleton className="h-6 w-14 rounded-none border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5" />
        </div>
      </div>
    </div>
  </div>
);

const SalesTransactionCardSkeleton = () => (
  <div className="border-2 border-black/10 dark:border-white/10 p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8 transition-colors duration-300">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 w-full xl:w-auto flex-1">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="border-b-2 border-black/10 dark:border-white/10 pb-1">
            <Skeleton className="h-2 w-20 rounded-none bg-black/10 dark:bg-white/10" />
          </div>
          <Skeleton className="h-5 w-full rounded-none bg-black/10 dark:bg-white/10" />
          <Skeleton className="h-3 w-16 rounded-none bg-black/10 dark:bg-white/10" />
        </div>
      ))}
    </div>
    <div className="pt-6 xl:pt-0 border-t-2 xl:border-t-0 xl:border-l-2 border-black/10 dark:border-white/10 xl:pl-8 w-full xl:w-auto shrink-0">
      <Skeleton className="h-14 w-full xl:w-36 rounded-none bg-black/10 dark:bg-white/10" />
    </div>
  </div>
);

export const SalesLedgerSkeleton = () => (
  <div className="space-y-6">
    {[...Array(4)].map((_, i) => (
      <SalesTransactionCardSkeleton key={i} />
    ))}
  </div>
);
