import { useEffect, useMemo, useState } from "react";
import { useGetSellerSalesTransactionsInfiniteQuery } from "@/hooks/apiQueries";
import { SalesTabProps, SellerSalesTransaction } from "../utils/types";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import SalesLedger from "../main-components/SalesLedger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATE_PRESET_OPTIONS,
  DEFAULT_PROJECT_OPTIONS,
} from "../utils/constants";
import { DatePreset } from "../utils/types";

export default function SalesTab({ logout }: SalesTabProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useGetSellerSalesTransactionsInfiniteQuery(
    {
      limit: 20,
      date_preset: datePreset,
      project_filter: projectFilter,
    },
    { logout }
  );

  const transactions = useMemo<SellerSalesTransaction[]>(
    () => data?.pages.flatMap((page) => page.transactions) ?? [],
    [data]
  );

  const projectOptions =
    data?.pages[0]?.filter_meta?.project_options || DEFAULT_PROJECT_OPTIONS;

  // Reset projectFilter if the current value is no longer present in the options
  // (happens when date preset changes and a project has no sales in the new range,
  //  or when the project options aggregation fails on the backend)
  useEffect(() => {
    if (isLoading) return;
    if (projectFilter === "all" || projectFilter === "unlisted") return;
    const isPresent = projectOptions.some((o) => o.value === projectFilter);
    if (!isPresent) setProjectFilter("all");
  }, [projectOptions, isLoading]);

  const isLoadingInitial = isLoading;
  const isLoadingMore = isFetchingNextPage;
  const isInitialError = isError && transactions.length === 0;
  const hasMore = hasNextPage ?? false;

  const network =
    import.meta.env.VITE_SOLANA_NETWORK?.toLowerCase() || "devnet";
  const clusterParam =
    network === "mainnet" || network === "mainnet-beta"
      ? ""
      : `?cluster=${network}`;

  const handleLoadMore = () => {
    if (!hasMore || isLoadingInitial || isLoadingMore) return;
    fetchNextPage();
  };

  return (
    <AnimatedLoadWrapper>
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6 relative z-10">
        <div className="flex-shrink-0 mb-8 lg:mb-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              Sales
            </span>
          </div>

          <div className="flex items-start lg:items-center justify-between flex-col lg:flex-row gap-4">
            <div className="space-y-4">
              <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-black dark:text-white leading-none break-words hyphens-auto transition-colors duration-300">
                Sales Ledger
              </h1>
              <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
                Confirmed sales transactions with filter-synced pagination.
              </p>
            </div>

            {!isLoadingInitial && !isInitialError && (
              <span className="hidden md:block text-sm font-space text-black dark:text-white font-bold uppercase tracking-widest border-2 border-black dark:border-white px-4 py-2 bg-white dark:bg-[#050505] shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)]">
                Loaded {transactions.length} record
                {transactions.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-space text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
                Date Range
              </label>
              <Select
                value={datePreset}
                onValueChange={(v) => setDatePreset(v as DatePreset)}
                disabled={isLoadingInitial || isLoadingMore}
              >
                <SelectTrigger className="h-12 w-full rounded-none bg-transparent border-2 border-black dark:border-white text-black dark:text-white font-space font-bold uppercase tracking-widest text-[10px] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-300 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none bg-white dark:bg-[#050505] border-2 border-black dark:border-white text-black dark:text-white font-space tracking-widest uppercase text-[10px]">
                  {DATE_PRESET_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-none focus:bg-red-500 focus:text-white hover:bg-red-500 hover:text-white cursor-pointer transition-colors duration-200"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-space text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
                Project
              </label>
              <Select
                value={projectFilter}
                onValueChange={setProjectFilter}
                disabled={isLoadingInitial || isLoadingMore}
              >
                <SelectTrigger className="h-12 w-full rounded-none bg-transparent border-2 border-black dark:border-white text-black dark:text-white font-space font-bold uppercase tracking-widest text-[10px] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-300 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none bg-white dark:bg-[#050505] border-2 border-black dark:border-white text-black dark:text-white font-space tracking-widest uppercase text-[10px]">
                  {projectOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-none focus:bg-red-500 focus:text-white hover:bg-red-500 hover:text-white cursor-pointer transition-colors duration-200"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar hide-scrollbar-if-needed pr-2 flex flex-col">
          <SalesLedger
            transactions={transactions}
            isLoadingInitial={isLoadingInitial}
            isLoadingMore={isLoadingMore}
            isInitialError={isInitialError}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            clusterParam={clusterParam}
          />
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
