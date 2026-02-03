import { useState } from "react";
import { RepoImportProps } from "../utils/types";
import { Search, Lock, Github, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RepoImportSkeleton } from "../sub-components/Skeletons";

export default function PrivateRepoImport({
  userData,
  privateRepoData,
  repoDataLoading,
  totalListedProjectsDataLoading,
  totalListedProjectsData,
  setFormPropsAndSwitchUI,
  handleRefresh,
}: RepoImportProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleImportClick = (index: number) => {
    setFormPropsAndSwitchUI(privateRepoData[index]);
  };

  const filteredRepos = privateRepoData.filter((repo) => {
    if (!repo.name) return false;
    return repo.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col">
      <div className="rounded-xl h-full flex flex-col">
        <h2 className="flex-shrink-0 flex flex-row justify-between items-center text-xl lg:text-2xl font-semibold text-gray-100 mb-6 text-center lg:text-left md:text-left">
          <span className="text-left md:text-left">Import Git Repository</span>
          <span className="w-full text-right flex flex-col justify-center md:w-auto md:text-left md:block text-gray-400">
            {!totalListedProjectsDataLoading &&
              totalListedProjectsData &&
              totalListedProjectsData.data.totalListedProjects !== -1 &&
              totalListedProjectsData.data.totalListedProjects !== 0 &&
              `${totalListedProjectsData.data.totalListedProjects} / 2`}
          </span>
        </h2>

        <div className="flex-1 flex flex-col space-y-4 min-h-0 pb-1">
          <div className="flex-shrink-0 flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg text-gray-300">
            <div className="flex items-center space-x-2">
              <Github className="h-4 w-4 text-purple-400" />
              <span>{userData.username}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-8 w-8 hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={
                !totalListedProjectsDataLoading &&
                totalListedProjectsData &&
                (totalListedProjectsData.data.totalListedProjects >= 2 ||
                  totalListedProjectsData.data.totalListedProjects === -1)
              }
              className="pl-10 bg-white/5 border-white/10 text-gray-300 w-full focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-indigo-500/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="relative flex-1 min-h-0 mb-2">
            <ScrollArea className="h-full rounded-lg border border-white/10">
              <div className="space-y-2 p-4">
                {repoDataLoading || totalListedProjectsDataLoading ? (
                  Array.from({ length: 20 }).map((_, index) => (
                    <RepoImportSkeleton key={index} />
                  ))
                ) : filteredRepos.length > 0 ? (
                  filteredRepos.map((repo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center text-gray-300 font-medium border border-white/10">
                          {repo.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-200 font-medium truncate">
                              {repo.name.length > 30
                                ? repo.name.slice(0, 27) + "..."
                                : repo.name}
                            </span>
                            <div className="flex items-center space-x-1">
                              <Lock className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-500 text-sm">
                                {repo.updated_at}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 text-blue-100 border border-blue-500/20 hover:border-blue-500/40 shrink-0 transition-all duration-200 rounded-xl"
                          onClick={() => handleImportClick(index)}
                        >
                          Import
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    No matching repositories found.
                  </div>
                )}
              </div>
            </ScrollArea>

            {!totalListedProjectsDataLoading &&
              totalListedProjectsData &&
              (totalListedProjectsData.data.totalListedProjects >= 2 ||
                totalListedProjectsData.data.totalListedProjects === -1) && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg p-4">
                  <div className="relative w-full max-w-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-2xl rounded-2xl pointer-events-none opacity-50" />
                    
                    <div className="relative bg-gray-900/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                          <AlertCircle className="w-6 h-6 text-gray-400" />
                        </div>

                        <h3 className="text-lg font-medium text-gray-200 mb-2">
                          {totalListedProjectsData.data.totalListedProjects >= 2
                            ? "Limit Reached"
                            : "Error"}
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                          {totalListedProjectsData.data.totalListedProjects >= 2
                            ? "Only two projects can be listed at a time."
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
