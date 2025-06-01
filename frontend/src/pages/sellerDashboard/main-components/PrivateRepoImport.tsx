import { useState } from "react";
import { RepoImportProps } from "../utils/types";
import { Search, Lock, Github, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RepoImportSkeleton } from "../sub-components/Skeletons";
import { MagicCard } from "@/components/ui/magic-card";

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
    <div>
      <MagicCard
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg transition-all duration-300 ease-in-out"
        gradientSize={300}
        gradientColor="#3B82F6"
        gradientOpacity={0.2}
      >
        <h2 className="flex flex-row justify-between items-center text-2xl font-semibold text-gray-100 mb-6 text-center lg:text-left md:text-left">
          <span className="text-left md:text-left">Import Git Repository</span>
          <span className="w-full text-right flex flex-col justify-center md:w-auto md:text-left md:block">
            {!totalListedProjectsDataLoading &&
              totalListedProjectsData &&
              totalListedProjectsData.data.totalListedProjects !== -1 &&
              totalListedProjectsData.data.totalListedProjects !== 0 &&
              `${totalListedProjectsData.data.totalListedProjects} / 2`}
          </span>
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300">
            <div className="flex items-center space-x-2">
              <Github className="h-4 w-4" />
              <span>{userData.username}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-8 w-8 hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-700 text-gray-300 w-full"
            />
          </div>

          <ScrollArea className="max-h-[80vh] overflow-y-auto rounded-md border border-gray-700">
            <div className="relative">
              {!totalListedProjectsDataLoading &&
                totalListedProjectsData &&
                (totalListedProjectsData.data.totalListedProjects >= 2 ||
                  totalListedProjectsData.data.totalListedProjects === -1) && (
                  <div className="absolute inset-0 bg-gray-900/90 z-10 flex items-center justify-center p-4">
                    <div className="max-w-sm mx-auto text-center">
                      <p className="text-gray-200 font-medium text-base sm:text-lg break-words">
                        {totalListedProjectsData.data.totalListedProjects >= 2
                          ? "Only two projects can be listed at a time."
                          : "Something went wrong. Please refresh."}
                      </p>
                    </div>
                  </div>
                )}
              <div className="space-y-2 p-4">
                {repoDataLoading || totalListedProjectsDataLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <RepoImportSkeleton key={index} />
                  ))
                ) : filteredRepos.length > 0 ? (
                  filteredRepos.map((repo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-300 font-medium">
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
                              <Lock className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-400 text-sm">
                                {repo.updated_at}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          className="bg-gray-800 shrink-0"
                          onClick={() => handleImportClick(index)}
                        >
                          Import
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400">
                    No matching repositories found.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </MagicCard>
    </div>
  );
}
