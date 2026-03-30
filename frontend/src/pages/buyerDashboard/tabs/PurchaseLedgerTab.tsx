import {
  AlertTriangle,
  ExternalLink,
  Activity,
  Download,
  Loader2,
} from "lucide-react";
import { useGetPurchasedProjectsQuery } from "@/hooks/apiQueries";
import { useDownloadProjectMutation } from "@/hooks/apiMutations";
import { PurchaseLedgerTabProps } from "../utils/types";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function PurchaseLedgerTab({ logout }: PurchaseLedgerTabProps) {
  const [downloadingPurchaseId, setDownloadingPurchaseId] = useState<
    string | null
  >(null);
  const {
    data: purchases,
    isLoading,
    isError,
  } = useGetPurchasedProjectsQuery({ logout });
  const downloadMutation = useDownloadProjectMutation({ logout });

  const truncateTx = (sig: string) => `${sig.slice(0, 8)}...${sig.slice(-8)}`;

  const network =
    import.meta.env.VITE_SOLANA_NETWORK?.toLowerCase() || "devnet";
  const clusterParam =
    network === "mainnet" || network === "mainnet-beta"
      ? ""
      : `?cluster=${network}`;

  return (
    <AnimatedLoadWrapper>
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6 relative z-10">
        <div className="flex-shrink-0 mb-8 lg:mb-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              Purchase Ledger
            </span>
          </div>

          <div className="flex items-start lg:items-center justify-between flex-col lg:flex-row gap-4">
            <div className="space-y-4">
              <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-black dark:text-white leading-none break-words hyphens-auto transition-colors duration-300">
                Purchase Ledger
              </h1>
              <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
                Immutable record of all acquired repository archives.
              </p>
            </div>

            {!isLoading && !isError && (
              <span className="hidden md:block text-sm font-space text-black dark:text-white font-bold uppercase tracking-widest border-2 border-black dark:border-white px-4 py-2 bg-white dark:bg-[#050505] shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)]">
                Loaded {purchases?.length ?? 0} record
                {(purchases?.length ?? 0) !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar hide-scrollbar-if-needed pr-2 flex flex-col">
          {isLoading && (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="border-2 border-black/10 dark:border-white/10 p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8 transition-colors duration-300"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 w-full xl:w-auto flex-1">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="flex flex-col gap-3">
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
              ))}
            </div>
          )}

          {isError && !isLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-full border-2 border-red-500 bg-red-500/5 p-8 lg:p-10 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                <div className="mb-6">
                  <div className="w-14 h-14 bg-red-500/10 flex items-center justify-center border-2 border-red-500 animate-[pulse_1s_steps(2,start)_infinite]">
                    <AlertTriangle
                      className="h-7 w-7 text-red-500"
                      strokeWidth={2}
                    />
                  </div>
                </div>
                <h2 className="text-xl lg:text-2xl font-syne uppercase tracking-widest font-black text-red-500 mb-4 transition-colors duration-300">
                  Purchase Ledger Unavailable
                </h2>
                <div className="font-space max-w-xl mx-auto space-y-3">
                  <p className="text-red-500/80 uppercase tracking-wider text-xs font-bold">
                    [Error: Failed to Load Purchase Transactions]
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300">
                    We couldn't retrieve your purchase history. Please check
                    your connection and reload.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !isError && (!purchases || purchases.length === 0) && (
            <div className="flex-1 p-4 lg:p-6 flex flex-col items-center justify-center">
              <div className="w-full max-w-2xl border-2 border-black dark:border-white bg-white dark:bg-[#050505] p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300">
                <div className="mb-8">
                  <div className="w-16 h-16 bg-black/5 dark:bg-white/5 flex items-center justify-center border-2 border-black dark:border-white">
                    <Activity
                      className="h-8 w-8 text-black dark:text-white"
                      strokeWidth={2}
                    />
                  </div>
                </div>
                <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-black dark:text-white mb-6 transition-colors duration-300">
                  No Purchases Found
                </h2>
                <div className="font-space max-w-md mx-auto space-y-4">
                  <p className="text-black/40 dark:text-white/40 uppercase tracking-wider text-sm font-bold">
                    [Status: No Transactions Found]
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300 uppercase tracking-wider">
                    No confirmed acquisitions on record. Browse the marketplace
                    to get started.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !isError && purchases && purchases.length > 0 && (
            <div className="space-y-6 lg:space-y-8">
              {purchases.map((purchase) => {
                const purchaseTitle = purchase.project_snapshot.title;
                const currentTitle = purchase.projectId?.title ?? null;
                const title = currentTitle ?? purchaseTitle;
                const projectType =
                  purchase.projectId?.project_type ??
                  purchase.project_snapshot.project_type;
                const sellerName = purchase.seller_snapshot.name;
                const sellerUsername = purchase.seller_snapshot.username;
                const isDeleted = purchase.projectId === null;
                const showPurchaseTitle =
                  currentTitle !== null && currentTitle !== purchaseTitle;

                return (
                  <div
                    key={purchase._id}
                    className="border-2 border-black dark:border-white bg-white dark:bg-[#050505] transition-colors duration-300 hover:border-red-500 dark:hover:border-red-500"
                  >
                    <div className="p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                      {/* Data Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 w-full xl:w-auto flex-1">
                        {/* Project Name block */}
                        <div className="flex flex-col">
                          <span className="font-space text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-black/10 dark:border-white/10 pb-1">
                            Acquired Asset
                          </span>
                          <h3 className="font-space font-bold text-base text-black dark:text-white uppercase tracking-widest break-words hyphens-auto mt-1 line-clamp-2">
                            {title}
                          </h3>
                          {showPurchaseTitle && (
                            <span
                              className="font-space text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 line-clamp-1"
                              title={purchaseTitle}
                            >
                              At purchase: {purchaseTitle}
                            </span>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="font-space text-[10px] bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 px-2 py-1 text-black dark:text-white uppercase tracking-widest transition-colors duration-300">
                              {projectType}
                            </span>
                            {purchase.purchased_package?.commit_sha && (
                              <span className="font-space text-[10px] bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 px-2 py-1 text-black dark:text-white uppercase tracking-widest transition-colors duration-300">
                                {purchase.purchased_package.commit_sha.slice(
                                  0,
                                  7
                                )}
                              </span>
                            )}
                            {isDeleted && (
                              <span className="font-space text-[10px] font-bold text-white uppercase tracking-widest bg-red-500 px-2 py-1">
                                Terminated
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Origin block */}
                        <div className="flex flex-col">
                          <span className="font-space text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-black/10 dark:border-white/10 pb-1">
                            Origin / Seller
                          </span>
                          <div className="mt-1 space-y-1">
                            <span className="block font-space font-bold text-sm text-black dark:text-white uppercase tracking-widest truncate">
                              {sellerName}
                            </span>
                            <span className="block font-space text-[11px] text-gray-500 uppercase tracking-widest truncate">
                              @{sellerUsername}
                            </span>
                          </div>
                        </div>

                        {/* Value block */}
                        <div className="flex flex-col">
                          <span className="font-space text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-black/10 dark:border-white/10 pb-1">
                            Settlement Value
                          </span>
                          <div className="mt-1 flex items-end gap-3">
                            <span className="font-syne font-black text-2xl lg:text-3xl text-black dark:text-white leading-none tracking-widest">
                              ${purchase.price_usd.toFixed(2)}
                            </span>
                            <span className="font-space text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                              {purchase.price_sol_total.toFixed(4)} SOL
                            </span>
                          </div>
                        </div>

                        {/* Timestamp block */}
                        <div className="flex flex-col">
                          <span className="font-space text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-black/10 dark:border-white/10 pb-1">
                            Timestamp
                          </span>
                          <div className="mt-1 flex flex-col justify-center h-full pb-3">
                            <span className="block font-space font-bold text-sm text-black dark:text-white uppercase tracking-widest">
                              {new Date(purchase.createdAt)
                                .toLocaleDateString("en-US", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  timeZone: "UTC",
                                })
                                .replace(/,/g, "")}
                            </span>
                            <span className="block font-space text-[10px] text-red-500 uppercase tracking-widest mt-1">
                              {new Date(purchase.createdAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                  timeZone: "UTC",
                                }
                              )}{" "}
                              UTC
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Region */}
                      <div className="pt-6 xl:pt-0 border-t-2 xl:border-t-0 xl:border-l-2 border-black/10 dark:border-white/10 xl:pl-8 flex flex-col gap-3 w-full xl:w-auto shrink-0 transition-colors duration-300">
                        <button
                          onClick={() => {
                            setDownloadingPurchaseId(purchase._id);
                            downloadMutation.mutate(
                              {
                                project_id: purchase.projectId?._id,
                                purchase_id: purchase._id,
                                version: "purchased",
                              },
                              {
                                onSettled: () => setDownloadingPurchaseId(null),
                              }
                            );
                          }}
                          disabled={
                            downloadingPurchaseId === purchase._id ||
                            !purchase.can_download_purchased
                          }
                          className="group/btn relative w-full xl:w-auto inline-flex items-center justify-center gap-3 bg-black dark:bg-white text-white dark:text-black px-6 lg:px-8 py-4 font-space font-bold uppercase tracking-widest text-xs transition-colors duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="relative z-10 flex items-center gap-2 group-hover/btn:text-white transition-colors">
                            {downloadingPurchaseId === purchase._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">
                              Download Purchased Version
                            </span>
                            <span className="sm:hidden">Download</span>
                          </span>
                          <div className="absolute inset-0 bg-red-500 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                        </button>
                        <a
                          href={`https://solscan.io/tx/${purchase.tx_signature}${clusterParam}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/btn relative w-full xl:w-auto inline-flex items-center justify-center gap-3 border-2 border-black dark:border-white bg-white dark:bg-[#050505] text-black dark:text-white px-6 lg:px-8 py-4 font-space font-bold uppercase tracking-widest text-xs transition-colors duration-300 overflow-hidden"
                        >
                          <span className="relative z-10 flex items-center gap-2 group-hover/btn:text-white transition-colors">
                            <span className="hidden sm:inline">Inspect TX</span>
                            <span className="sm:hidden">
                              TX: {truncateTx(purchase.tx_signature)}
                            </span>
                            <ExternalLink className="w-4 h-4" />
                          </span>
                          <div className="absolute inset-0 bg-red-500 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
