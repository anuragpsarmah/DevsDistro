import { Activity, Loader2 } from "lucide-react";
import { ErrorScreenDashboardSection } from "../sub-components/ErrorScreens";
import SalesTransactionCard from "../sub-components/SalesTransactionCard";
import { SalesLedgerSkeleton } from "../sub-components/Skeletons";
import { SalesLedgerProps } from "../utils/types";

export default function SalesLedger({
  transactions,
  isLoadingInitial,
  isLoadingMore,
  isInitialError,
  hasMore,
  onLoadMore,
  clusterParam,
}: SalesLedgerProps) {
  if (isLoadingInitial) {
    return <SalesLedgerSkeleton />;
  }

  if (isInitialError) {
    return (
      <ErrorScreenDashboardSection
        title="Sales Ledger Unavailable"
        errorCode="[Error: Failed to Load Sales Transactions]"
        description="We couldn't retrieve your sales transactions. Please check your connection and reload."
      />
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex-1 p-4 lg:p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl border-2 border-neutral-800 dark:border-white bg-white dark:bg-[#050505] p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300">
          <div className="mb-8">
            <div className="w-16 h-16 bg-neutral-800/5 dark:bg-white/5 flex items-center justify-center border-2 border-neutral-800 dark:border-white">
              <Activity
                className="h-8 w-8 text-neutral-800 dark:text-white"
                strokeWidth={2}
              />
            </div>
          </div>

          <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-neutral-800 dark:text-white mb-6 transition-colors duration-300">
            No Sales Found
          </h2>

          <div className="font-space max-w-md mx-auto space-y-4">
            <p className="text-neutral-800/40 dark:text-white/40 uppercase tracking-wider text-sm font-bold">
              [Status: No Transactions Found]
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300 uppercase tracking-wider">
              No confirmed transactions matched your selected filters.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 pb-6">
      {transactions.map((transaction) => (
        <SalesTransactionCard
          key={transaction._id}
          transaction={transaction}
          clusterParam={clusterParam}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-3 px-6 py-3 border-2 border-neutral-800 dark:border-white bg-white dark:bg-[#050505] text-neutral-800 dark:text-white font-space font-bold uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 hover:text-white dark:hover:bg-white dark:hover:text-neutral-800 transition-colors"
          >
            {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoadingMore ? "Loading" : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
