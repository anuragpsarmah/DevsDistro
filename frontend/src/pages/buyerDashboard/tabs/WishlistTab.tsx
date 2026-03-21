import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Heart, SearchX, Loader2 } from "lucide-react";
import {
  useGetWishlistInfiniteQuery,
  useGetWishlistCountQuery,
  useGetPurchasedProjectsQuery,
} from "@/hooks/apiQueries";
import MarketplaceProjectCard from "../sub-components/MarketplaceProjectCard";
import MarketplaceCardSkeleton from "../sub-components/MarketplaceCardSkeleton";
import { TransitionWrapper } from "../sub-components/TransitionWrapper";
import ProjectDetailPage from "../sub-components/ProjectDetailPage";
import { WishlistTabProps } from "../utils/types";

export default function WishlistTab({ logout }: WishlistTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useGetWishlistInfiniteQuery({ logout });
  const { data: wishlistCount } = useGetWishlistCountQuery({ logout });
  const { data: purchases } = useGetPurchasedProjectsQuery({ logout });

  const allProjects = useMemo(
    () => data?.pages.flatMap((page) => page.projects) ?? [],
    [data]
  );
  const countDisplay =
    wishlistCount !== undefined && wishlistCount > 0
      ? wishlistCount > 99
        ? "99+"
        : String(wishlistCount)
      : null;

  const purchasedIds = useMemo(() => {
    const ids = new Set<string>();
    (purchases ?? []).forEach((p) => {
      if (p.projectId) ids.add(p.projectId._id);
    });
    return ids;
  }, [purchases]);

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
          backLabel="Back to Wishlist"
        />
      </TransitionWrapper>
    );
  }

  return (
    <TransitionWrapper
      identifier="wishlist-list"
      isTransitioning={false}
      className="h-full"
    >
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6">
        <div className="flex-shrink-0 mb-8 lg:mb-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              Wishlist
            </span>
          </div>
          <div className="flex items-start lg:items-center justify-between flex-col lg:flex-row gap-4">
            <div className="space-y-4">
              <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-black dark:text-white leading-none transition-colors duration-300">
                Saved Projects
              </h1>
              <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
                Projects you've saved for later review and purchase.
              </p>
            </div>
            {countDisplay !== null && (
              <span className="hidden md:block text-sm font-space text-black dark:text-white font-bold uppercase tracking-widest border-2 border-black dark:border-white px-4 py-2 bg-white dark:bg-[#050505] shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)]">
                {countDisplay} saved
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
                Something went wrong while fetching your wishlist. Please try
                again later.
              </p>
            </div>
          )}

          {!isLoading && !isError && allProjects.length === 0 && (
            <div className="flex-1 p-4 lg:p-6 flex flex-col items-center justify-center">
              <div className="w-full max-w-2xl border-2 border-black dark:border-white bg-white dark:bg-[#050505] p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300">
                <div className="mb-8">
                  <div className="w-16 h-16 bg-black/5 dark:bg-white/5 flex items-center justify-center border-2 border-black dark:border-white">
                    <Heart
                      className="h-8 w-8 text-black dark:text-white"
                      strokeWidth={2}
                    />
                  </div>
                </div>

                <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-black dark:text-white mb-6 transition-colors duration-300">
                  Your Wishlist is Empty
                </h2>

                <div className="font-space max-w-md mx-auto space-y-4">
                  <p className="text-black/40 dark:text-white/40 uppercase tracking-wider text-sm font-bold">
                    [Status: No Saved Projects]
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300 uppercase tracking-wider">
                    Browse the Marketplace and save projects you're interested
                    in. They will appear here.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !isError && allProjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 pt-2 pb-10">
              {allProjects.map((project) => (
                <MarketplaceProjectCard
                  key={project._id}
                  project={project}
                  onProjectClick={(id) => setSelectedProjectId(id)}
                  logout={logout}
                  isPurchased={purchasedIds.has(project._id)}
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
            allProjects.length > 0 &&
            !hasNextPage &&
            !isFetchingNextPage && (
              <p className="text-center font-space font-bold uppercase tracking-widest text-black dark:text-white text-sm pb-4 pt-4">
                System Update: End of Wishlist Reached
              </p>
            )}
        </div>
      </div>
    </TransitionWrapper>
  );
}
