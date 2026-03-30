import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ShoppingBag,
  SearchX,
  Download,
  Loader2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useGetPurchasedProjectsInfiniteQuery } from "@/hooks/apiQueries";
import {
  useDownloadProjectMutation,
  useDownloadReceiptMutation,
} from "@/hooks/apiMutations";
import MarketplaceProjectCard from "../sub-components/MarketplaceProjectCard";
import MarketplaceCardSkeleton from "../sub-components/MarketplaceCardSkeleton";
import { TransitionWrapper } from "../sub-components/TransitionWrapper";
import ProjectDetailPage from "../sub-components/ProjectDetailPage";
import { OrdersTabProps } from "../utils/types";

export default function OrdersTab({ logout }: OrdersTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [receiptingId, setReceiptingId] = useState<string | null>(null);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useGetPurchasedProjectsInfiniteQuery({ logout });
  const downloadMutation = useDownloadProjectMutation({ logout });
  const receiptMutation = useDownloadReceiptMutation({ logout });

  const allPurchases = useMemo(
    () => data?.pages.flatMap((page) => page.purchases) ?? [],
    [data]
  );

  // Only show purchases where the project still exists in the DB
  const activePurchases = allPurchases.filter((p) => p.projectId !== null);

  const getDownloadKey = (
    purchaseId: string,
    version: "latest" | "purchased"
  ) => `${purchaseId}:${version}`;

  const isPurchaseDownloadInFlight = (purchaseId: string) =>
    downloadingKey?.startsWith(`${purchaseId}:`) ?? false;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root,
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  if (selectedProjectId) {
    return (
      <TransitionWrapper identifier={selectedProjectId} isTransitioning={false}>
        <ProjectDetailPage
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
          logout={logout}
          backLabel="Back to Purchases"
        />
      </TransitionWrapper>
    );
  }

  return (
    <TransitionWrapper
      identifier="orders-list"
      isTransitioning={false}
      className="h-full"
    >
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6">
        <div className="flex-shrink-0 mb-8 lg:mb-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              Purchases
            </span>
          </div>
          <div className="flex items-start lg:items-center justify-between flex-col lg:flex-row gap-4">
            <div className="space-y-4">
              <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-black dark:text-white leading-none transition-colors duration-300">
                Purchased Projects
              </h1>
              <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
                Download and manage your acquired repository archives.
              </p>
            </div>
            {!isLoading && activePurchases.length > 0 && (
              <span className="hidden md:block text-sm font-space text-black dark:text-white font-bold uppercase tracking-widest border-2 border-black dark:border-white px-4 py-2 bg-white dark:bg-[#050505] shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)]">
                {activePurchases.length} purchased
              </span>
            )}
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col hide-scrollbar-if-needed"
        >
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 pt-2">
              {[...Array(6)].map((_, i) => (
                <MarketplaceCardSkeleton key={i} />
              ))}
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6 border-2 border-black dark:border-white bg-white dark:bg-[#050505] shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] p-8 my-8">
              <div className="w-16 h-16 border-2 border-black dark:border-white flex items-center justify-center bg-red-500">
                <SearchX className="w-8 h-8 text-white" />
              </div>
              <p className="font-space font-bold uppercase tracking-widest text-black dark:text-white text-center max-w-md">
                Something went wrong while fetching your purchases. Please try
                again later.
              </p>
            </div>
          )}

          {!isLoading &&
            !isError &&
            allPurchases.length > 0 &&
            activePurchases.length === 0 && (
              <div className="flex-1 p-4 lg:p-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl border-2 border-black dark:border-white bg-white dark:bg-[#050505] p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300">
                  <div className="mb-8">
                    <div className="w-16 h-16 bg-black/5 dark:bg-white/5 flex items-center justify-center border-2 border-black dark:border-white">
                      <ShoppingBag
                        className="h-8 w-8 text-black dark:text-white"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-black dark:text-white mb-6 transition-colors duration-300">
                    No Active Purchases
                  </h2>
                  <div className="font-space max-w-md mx-auto space-y-4">
                    <p className="text-black/40 dark:text-white/40 uppercase tracking-wider text-sm font-bold">
                      [Status: All Projects Removed]
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300 uppercase tracking-wider">
                      All your purchased projects have been removed by their
                      sellers. Your full transaction history is available in the
                      Purchase Ledger tab.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {!isLoading && !isError && allPurchases.length === 0 && (
            <div className="flex-1 p-4 lg:p-6 flex flex-col items-center justify-center">
              <div className="w-full max-w-2xl border-2 border-black dark:border-white bg-white dark:bg-[#050505] p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300">
                <div className="mb-8">
                  <div className="w-16 h-16 bg-black/5 dark:bg-white/5 flex items-center justify-center border-2 border-black dark:border-white">
                    <ShoppingBag
                      className="h-8 w-8 text-black dark:text-white"
                      strokeWidth={2}
                    />
                  </div>
                </div>

                <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-black dark:text-white mb-6 transition-colors duration-300">
                  No Purchases Yet
                </h2>

                <div className="font-space max-w-md mx-auto space-y-4">
                  <p className="text-black/40 dark:text-white/40 uppercase tracking-wider text-sm font-bold">
                    [Status: No Purchases]
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300 uppercase tracking-wider">
                    Browse the Marketplace and purchase projects. They will
                    appear here with a download option.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !isError && activePurchases.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 pt-2 pb-10">
              {activePurchases.map((purchase) => (
                <MarketplaceProjectCard
                  key={purchase._id}
                  project={purchase.projectId!}
                  onProjectClick={(id) => setSelectedProjectId(id)}
                  logout={logout}
                  isPurchased={true}
                  footerContent={
                    <div className="flex flex-col gap-0">
                      {purchase.projectId?.scheduled_deletion_at && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border-b-2 border-amber-500">
                          <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          <span className="font-space text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                            Seller has unlisted this project. It is scheduled
                            for deletion on{" "}
                            {new Date(
                              purchase.projectId.scheduled_deletion_at
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="font-space text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                          {new Date(purchase.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const id = purchase._id;
                              setReceiptingId(id);
                              receiptMutation.mutate(id, {
                                onSettled: () => setReceiptingId(null),
                              });
                            }}
                            disabled={receiptingId === purchase._id}
                            title="Download Receipt"
                            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#050505] text-black dark:text-white font-space font-bold uppercase tracking-widest text-[10px] border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {receiptingId === purchase._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FileText className="w-3 h-3" />
                            )}
                            Receipt
                          </button>
                          <button
                            onClick={() => {
                              const key = getDownloadKey(
                                purchase._id,
                                "purchased"
                              );
                              setDownloadingKey(key);
                              downloadMutation.mutate(
                                {
                                  project_id: purchase.projectId!._id,
                                  purchase_id: purchase._id,
                                  version: "purchased",
                                },
                                {
                                  onSettled: () => setDownloadingKey(null),
                                }
                              );
                            }}
                            disabled={
                              isPurchaseDownloadInFlight(purchase._id) ||
                              !purchase.can_download_purchased
                            }
                            className="flex items-center gap-1.5 px-3 py-2 bg-black dark:bg-white text-white dark:text-black font-space font-bold uppercase tracking-widest text-[10px] border-2 border-black dark:border-white hover:bg-red-500 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {downloadingKey ===
                            getDownloadKey(purchase._id, "purchased") ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            Purchased
                          </button>
                          {purchase.can_download_latest && (
                            <button
                              onClick={() => {
                                const key = getDownloadKey(
                                  purchase._id,
                                  "latest"
                                );
                                setDownloadingKey(key);
                                downloadMutation.mutate(
                                  {
                                    project_id: purchase.projectId!._id,
                                    purchase_id: purchase._id,
                                    version: "latest",
                                  },
                                  {
                                    onSettled: () => setDownloadingKey(null),
                                  }
                                );
                              }}
                              disabled={isPurchaseDownloadInFlight(
                                purchase._id
                              )}
                              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#050505] text-black dark:text-white font-space font-bold uppercase tracking-widest text-[10px] border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {downloadingKey ===
                              getDownloadKey(purchase._id, "latest") ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              Latest
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  }
                />
              ))}
              {isFetchingNextPage &&
                [...Array(3)].map((_, i) => (
                  <MarketplaceCardSkeleton key={`loading-${i}`} />
                ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-1" />

          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            </div>
          )}

          {!isLoading &&
            activePurchases.length > 0 &&
            !hasNextPage &&
            !isFetchingNextPage && (
              <p className="text-center font-space font-bold uppercase tracking-widest text-black dark:text-white text-sm pb-4 pt-4">
                System Update: End of Purchases Reached
              </p>
            )}
        </div>
      </div>
    </TransitionWrapper>
  );
}
