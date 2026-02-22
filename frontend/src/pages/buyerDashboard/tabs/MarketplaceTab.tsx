import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Loader2, SearchX, Store } from "lucide-react";
import SearchBar from "../main-components/Searchbar";
import MarketplaceProjectCard from "../sub-components/MarketplaceProjectCard";
import MarketplaceCardSkeleton from "../sub-components/MarketplaceCardSkeleton";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import { useMarketplaceSearchQuery } from "@/hooks/apiQueries";
import { type MarketplaceSearchParams } from "@/utils/types";

interface MarketplaceTabProps {
  logout?: () => Promise<void>;
}

const DEBOUNCE_MS = 400;

export default function MarketplaceTab({ logout }: MarketplaceTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState("newest");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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

  return (
    <AnimatedLoadWrapper>
      <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl text-center md:text-left lg:text-left font-bold pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
            Marketplace
          </h1>
          {!isInitialLoading && totalCount > 0 && (
            <span className="hidden md:block text-sm text-gray-400">
              {totalCount.toLocaleString()} project
              {totalCount !== 1 ? "s" : ""} found
            </span>
          )}
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
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <SearchX className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-gray-400 text-center max-w-md">
              Something went wrong while fetching projects. Please try again
              later.
            </p>
          </div>
        )}

        {!isInitialLoading && !isError && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 flex items-center justify-center">
              {hasActiveFilters ? (
                <SearchX className="w-8 h-8 text-gray-400" />
              ) : (
                <Store className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="text-center space-y-2">
              <p className="text-gray-300 font-medium">
                {hasActiveFilters
                  ? "No projects match your search"
                  : "No projects available yet"}
              </p>
              <p className="text-gray-500 text-sm max-w-md">
                {hasActiveFilters
                  ? "Try adjusting your filters or search terms to find what you're looking for."
                  : "Projects will appear here once sellers start listing them."}
              </p>
            </div>
          </div>
        )}

        {!isInitialLoading && hasResults && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 pt-2">
            {allProjects.map((project) => (
              <MarketplaceProjectCard key={project._id} project={project} />
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
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        )}

        {!isInitialLoading &&
          hasResults &&
          !hasNextPage &&
          !isFetchingNextPage && (
            <p className="text-center text-gray-600 text-sm pb-4">
              You've reached the end
            </p>
          )}
      </div>
    </AnimatedLoadWrapper>
  );
}
