import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { isMongoObjectId } from "@/utils/navigation";
import { Loader2, SearchX, Store } from "lucide-react";
import SearchBar from "../main-components/Searchbar";
import MarketplaceProjectCard from "../sub-components/MarketplaceProjectCard";
import MarketplaceCardSkeleton from "../sub-components/MarketplaceCardSkeleton";
import { TransitionWrapper } from "../sub-components/TransitionWrapper";
import { useMarketplaceSearchQuery } from "@/hooks/apiQueries";
import { type MarketplaceSearchParams } from "@/utils/types";
import ProjectDetailPage from "../sub-components/ProjectDetailPage";
import { MarketplaceTabProps } from "../utils/types";
import { DEBOUNCE_MS } from "../utils/constants";

export default function MarketplaceTab({
  logout,
  initialProjectId,
}: MarketplaceTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState("newest");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (initialProjectId && isMongoObjectId(initialProjectId)) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  const searchParams: MarketplaceSearchParams = useMemo(
    () => ({
      searchTerm: debouncedSearch,
      projectTypes: selectedFilters,
      sortBy: selectedSort,
      limit: 12,
    }),
    [debouncedSearch, selectedFilters, selectedSort]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useMarketplaceSearchQuery(searchParams, { logout });

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
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "300px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const allProjects = useMemo(
    () => data?.pages.flatMap((page) => page.projects) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.pagination.totalCount ?? 0;
  const hasResults = allProjects.length > 0;
  const isInitialLoading = isLoading;
  const hasActiveFilters =
    debouncedSearch.length > 0 || selectedFilters.length > 0;

  if (selectedProjectId) {
    return (
      <TransitionWrapper identifier={selectedProjectId} isTransitioning={false}>
        <ProjectDetailPage
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
          logout={logout}
        />
      </TransitionWrapper>
    );
  }

  return (
    <TransitionWrapper identifier="marketplace-list" isTransitioning={false}>
      <div className="space-y-6 mt-6 lg:mt-0 md:mt-0 flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="flex-shrink-0 mb-8 lg:mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              Marketplace
            </span>
          </div>
          <div className="flex items-start lg:items-center justify-between flex-col lg:flex-row gap-4">
            <div className="space-y-4">
              <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-black dark:text-white leading-none break-words hyphens-auto transition-colors duration-300">
                Explore Projects
              </h1>
              <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
                Browse and discover source code projects from the community.
              </p>
            </div>
            {!isInitialLoading && totalCount > 0 && (
              <span className="hidden md:block text-sm font-space text-black dark:text-white font-bold uppercase tracking-widest border-2 border-black dark:border-white px-4 py-2 bg-white dark:bg-[#050505] shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)]">
                {totalCount.toLocaleString()} project
                {totalCount !== 1 ? "s" : ""} found
              </span>
            )}
          </div>
        </div>

        <SearchBar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedFilters={selectedFilters}
          onFiltersChange={setSelectedFilters}
          selectedSort={selectedSort}
          onSortChange={setSelectedSort}
        />

        {isInitialLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 pt-2">
            {[...Array(6)].map((_, i) => (
              <MarketplaceCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && !isInitialLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6 border-2 border-black dark:border-white bg-white dark:bg-[#050505] shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] p-8 my-8">
            <div className="w-16 h-16 border-2 border-black dark:border-white flex items-center justify-center bg-red-500">
              <SearchX className="w-8 h-8 text-white" />
            </div>
            <p className="font-space font-bold uppercase tracking-widest text-black dark:text-white text-center max-w-md">
              Something went wrong while fetching projects. Please try again
              later.
            </p>
          </div>
        )}

        {!isInitialLoading && !isError && !hasResults && (
          <div className="flex-1 p-4 lg:p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl border-2 border-black dark:border-white bg-white dark:bg-[#050505] p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300 mx-auto mt-12 mb-12">
              <div className="mb-8">
                <div className="w-16 h-16 bg-black/5 dark:bg-white/5 flex items-center justify-center border-2 border-black dark:border-white">
                  {hasActiveFilters ? (
                    <SearchX
                      className="h-8 w-8 text-black dark:text-white"
                      strokeWidth={2}
                    />
                  ) : (
                    <Store
                      className="h-8 w-8 text-black dark:text-white"
                      strokeWidth={2}
                    />
                  )}
                </div>
              </div>

              <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-black dark:text-white mb-6 transition-colors duration-300">
                {hasActiveFilters
                  ? "No projects match your search"
                  : "No projects available yet"}
              </h2>

              <div className="font-space max-w-md mx-auto space-y-4">
                <p className="text-black/40 dark:text-white/40 uppercase tracking-wider text-sm font-bold">
                  {hasActiveFilters
                    ? "[Status: Zero Results]"
                    : "[Status: Marketplace Empty]"}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300 uppercase tracking-wider">
                  {hasActiveFilters
                    ? "Try adjusting your filters or search terms to find what you're looking for."
                    : "Projects will appear here once sellers start listing them."}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isInitialLoading && hasResults && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 pt-2">
            {allProjects.map((project) => (
              <MarketplaceProjectCard
                key={project._id}
                project={project}
                onProjectClick={(id) => setSelectedProjectId(id)}
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

        {!isInitialLoading &&
          hasResults &&
          !hasNextPage &&
          !isFetchingNextPage && (
            <p className="text-center font-space font-bold uppercase tracking-widest text-black dark:text-white text-sm pb-4 pt-4">
              System Update: End of Catalog Reached
            </p>
          )}
      </div>
    </TransitionWrapper>
  );
}
