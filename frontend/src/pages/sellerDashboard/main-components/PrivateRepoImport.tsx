import { useState, useRef, useEffect, useCallback } from "react";
import { RepoImportProps } from "../utils/types";
import {
  Search,
  Lock,
  Github,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RepoImportSkeleton } from "../sub-components/Skeletons";

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

export default function PrivateRepoImport({
  userData,
  privateRepoData,
  repoDataLoading,
  repoDataError,
  totalListedProjectsDataLoading,
  totalListedProjectsData,
  setFormPropsAndSwitchUI,
  handleRefresh,
  isRefreshing,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: RepoImportProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredRepos = privateRepoData.filter((repo) => {
    if (!repo.name) return false;
    return repo.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleScroll = useCallback(() => {
    if (searchQuery || !hasNextPage || isFetchingNextPage) return;

    const viewport = scrollContainerRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      fetchNextPage();
    }
  }, [searchQuery, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const viewport = scrollContainerRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    if (!viewport) return;

    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (repoDataLoading || !hasNextPage || isFetchingNextPage || searchQuery)
      return;

    const viewport = scrollContainerRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    if (!viewport) return;

    if (viewport.scrollHeight <= viewport.clientHeight) {
      fetchNextPage();
    }
  }, [
    privateRepoData,
    hasNextPage,
    isFetchingNextPage,
    searchQuery,
    fetchNextPage,
    repoDataLoading,
  ]);

  // When the user searches, eagerly load all remaining pages so the filter covers the full repo list.
  useEffect(() => {
    if (!searchQuery || !hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
  }, [searchQuery, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="h-full flex flex-col">
      <div className="rounded-xl h-full flex flex-col">
        <h2 className="flex-shrink-0 flex flex-row justify-between items-center text-xl lg:text-3xl font-syne font-bold uppercase tracking-widest text-black dark:text-white mb-8 text-center lg:text-left md:text-left transition-colors duration-300">
          <span className="text-left md:text-left">Import Repository</span>
          <span className="w-full text-right flex flex-col justify-center md:w-auto md:text-left md:block text-gray-500 dark:text-gray-400 font-space text-sm">
            {!totalListedProjectsDataLoading &&
              totalListedProjectsData &&
              totalListedProjectsData.data.totalListedProjects !== -1 &&
              totalListedProjectsData.data.totalListedProjects !== 0 &&
              `${totalListedProjectsData.data.totalListedProjects} / ${totalListedProjectsData.data.projectListingLimit}`}
          </span>
        </h2>

        <div className="flex-1 flex flex-col space-y-4 min-h-0 pb-1">
          <div className="flex-shrink-0 flex items-center justify-between p-4 bg-transparent border-2 border-black/20 dark:border-white/20 rounded-none text-black dark:text-white font-space transition-colors duration-300">
            <div className="flex items-center space-x-3">
              <Github className="h-5 w-5" />
              <span className="font-bold">{userData.username}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 w-10 rounded-none hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white transition-colors duration-300"
            >
              <RefreshCw
                className={`h-5 w-5 ${isRefreshing ? "animate-spin text-red-500" : ""}`}
              />
            </Button>
          </div>

          <div className="relative flex-shrink-0 mt-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
            <Input
              type="text"
              placeholder="SEARCH REPOSITORIES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={
                !totalListedProjectsDataLoading &&
                totalListedProjectsData &&
                (totalListedProjectsData.data.totalListedProjects >=
                  totalListedProjectsData.data.projectListingLimit ||
                  totalListedProjectsData.data.totalListedProjects === -1)
              }
              className="pl-12 py-6 bg-transparent border-2 border-black/20 dark:border-white/20 text-black dark:text-white w-full rounded-none font-space placeholder:text-gray-400 focus:border-red-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            />
          </div>

          <div
            ref={scrollContainerRef}
            className="relative flex-1 min-h-0 mb-2 mt-4"
          >
            <ScrollArea className="h-full border-2 border-black/20 dark:border-white/20 rounded-none bg-black/5 dark:bg-white/5 transition-colors duration-300">
              <div className="space-y-0 p-0 hover:border-transparent h-full">
                {repoDataLoading || totalListedProjectsDataLoading ? (
                  Array.from({ length: 20 }).map((_, index) => (
                    <RepoImportSkeleton key={index} />
                  ))
                ) : repoDataError ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-64 space-y-4 px-6 text-center">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <p className="font-space text-sm text-red-500 uppercase tracking-wider font-bold">
                      Failed to load repositories
                    </p>
                    <p className="font-space text-xs text-gray-500 dark:text-gray-400">
                      Could not reach GitHub. Click refresh to try again.
                    </p>
                  </div>
                ) : filteredRepos.length > 0 ? (
                  <>
                    {filteredRepos.map((repo) => (
                      <div
                        key={repo.github_repo_id}
                        className="flex items-center justify-between p-5 bg-transparent border-b-2 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-200 last:border-b-0"
                      >
                        <div className="flex items-center space-x-4 w-full">
                          <div className="w-10 h-10 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-space font-bold uppercase transition-colors duration-300">
                            {repo.name.charAt(0)}
                          </div>
                          <div className="truncate flex-1">
                            <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-4">
                              <span className="font-space text-black dark:text-white font-bold truncate transition-colors duration-300">
                                {repo.name.length > 30
                                  ? repo.name.slice(0, 27) + "..."
                                  : repo.name}
                              </span>
                              <div className="flex items-center space-x-2">
                                <Lock className="h-3 w-3 text-red-500" />
                                <span className="font-space text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest transition-colors duration-300">
                                  {formatRelativeTime(repo.updated_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="default"
                            className="bg-black text-white dark:bg-white dark:text-black font-space font-bold uppercase tracking-widest text-[10px] rounded-none hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white border-2 border-transparent hover:border-black dark:hover:border-white transition-colors duration-300 px-6 py-4"
                            onClick={() => setFormPropsAndSwitchUI(repo)}
                          >
                            Import
                          </Button>
                        </div>
                      </div>
                    ))}

                    {isFetchingNextPage && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-black dark:text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    No matching repositories found.
                  </div>
                )}
              </div>
            </ScrollArea>

            {!totalListedProjectsDataLoading &&
              totalListedProjectsData &&
              (totalListedProjectsData.data.totalListedProjects >=
                totalListedProjectsData.data.projectListingLimit ||
                totalListedProjectsData.data.totalListedProjects === -1) && (
                <div className="absolute inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="relative w-full max-w-sm">
                    <div className="relative bg-white dark:bg-[#050505] p-8 border-2 border-black dark:border-white overflow-hidden text-center transition-colors duration-300">
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-12 h-12 border-2 border-black dark:border-white flex items-center justify-center mb-6 transition-colors duration-300">
                          <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>

                        <h3 className="font-syne text-2xl font-bold text-black dark:text-white mb-4 uppercase tracking-wider transition-colors duration-300">
                          {totalListedProjectsData.data.totalListedProjects >=
                          totalListedProjectsData.data.projectListingLimit
                            ? "Limit Reached"
                            : "Error"}
                        </h3>
                        <p className="font-space text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300">
                          {totalListedProjectsData.data.totalListedProjects >=
                          totalListedProjectsData.data.projectListingLimit
                            ? `Only ${totalListedProjectsData.data.projectListingLimit} projects can be listed at a time.`
                            : "Something went wrong. Please refresh."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
