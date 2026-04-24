import { useState, useMemo } from "react";
import { useRecoilState } from "recoil";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "@/lib/axiosInstance";
import { user } from "@/utils/atom";
import {
  usePrivateReposInfiniteQuery,
  useTotalListedProjectsQuery,
  useInstallationStatusQuery,
} from "@/hooks/apiQueries";
import {
  ListNewProjectTabProps,
  PrivateRepoData,
  projectListingValidatedFormData,
  ProjectMediaMetadata,
} from "../utils/types";
import PrivateRepoImport from "../main-components/PrivateRepoImport";
import ProjectListingForm from "../main-components/ProjectListingForm";
import GitHubAppInstallPrompt from "../main-components/GitHubAppInstallPrompt";
import { TransitionWrapper } from "../sub-components/TransitionWrapper";
import {
  usePreSignedUrlForProjectMediaUploadMutation,
  useValidateMediaUploadAndStoreProjectMutation,
} from "@/hooks/apiMutations";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { errorToast, successToast } from "@/components/ui/customToast";
import { tryCatch } from "@/utils/tryCatch.util";

export default function ListNewProjectTab({
  logout,
  setActiveTab,
}: ListNewProjectTabProps) {
  const [userData] = useRecoilState(user);
  const [isImportState, setIsImportState] = useState<boolean>(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formProps, setFormProps] = useState<PrivateRepoData>({
    name: "",
    description: "",
    language: "",
    updated_at: "",
    github_repo_id: "",
    installation_id: undefined,
  });

  const queryClient = useQueryClient();

  const { data: installationStatus, isLoading: installationStatusLoading } =
    useInstallationStatusQuery({ logout });

  const {
    data: totalListedProjectsData,
    isLoading: totalListedProjectsDataLoading,
  } = useTotalListedProjectsQuery({ logout });

  const {
    data: repoData,
    isLoading: repoDataLoading,
    isError: repoDataError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePrivateReposInfiniteQuery({ logout });

  const { mutateAsync: preSignedUrlMutate } =
    usePreSignedUrlForProjectMediaUploadMutation({
      logout,
    });

  const { mutateAsync: validationAndStoreMutate } =
    useValidateMediaUploadAndStoreProjectMutation({
      logout,
    });

  const allRepos = useMemo(() => {
    if (!repoData?.pages) return [];
    return repoData.pages.flatMap((page) => page.repos ?? []);
  }, [repoData]);

  const handleUIStateChange = (
    isImportState: boolean,
    newFormProps?: PrivateRepoData
  ) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsImportState(isImportState);
      if (newFormProps) {
        setFormProps(newFormProps);
      }
      setIsTransitioning(false);
    }, 200);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const [response, error] = await tryCatch(
      apiClient.get("/projects/getPrivateRepos?page=1&refreshStatus=true")
    );

    if (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        errorToast("Too many refresh requests. Please wait.");
      }
      setIsRefreshing(false);
      return;
    }

    const data = response.data.data;

    if (data?.isRateLimited) {
      successToast(
        response.data.message || "Too many requests. Cached data fetched."
      );
    }

    queryClient.setQueryData(["privateRepoQuery"], () => ({
      pages: [data],
      pageParams: [1],
    }));

    setIsRefreshing(false);
  };

  const handleGetPreSignedUrls = async (
    metadata: Array<ProjectMediaMetadata>,
    existingImageCount: number,
    existingVideoCount: number,
    modificationType: string,
    detailMetadata?: Array<ProjectMediaMetadata>
  ) => {
    const response = await preSignedUrlMutate({
      metadata,
      existingImageCount,
      existingVideoCount,
      modificationType,
      detailMetadata,
    });
    return response;
  };

  const handleValidateUploadAndStoreProject = async (
    projectData: projectListingValidatedFormData,
    modificationType: string
  ) => {
    const response = await validationAndStoreMutate({
      projectData,
      modificationType,
    });
    return response;
  };

  return (
    <AnimatedLoadWrapper>
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6">
        <div className="flex-shrink-0 mb-8 lg:mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              List Project
            </span>
          </div>
          <div>
            <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-neutral-800 dark:text-white leading-none break-words hyphens-auto transition-colors duration-300">
              List New Project
            </h1>
            <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
              Import and list your project for sale.
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          {!installationStatusLoading &&
          !installationStatus?.data?.hasInstallation ? (
            <GitHubAppInstallPrompt
              installUrl={installationStatus?.data?.installUrl || ""}
            />
          ) : (
            <div className="relative h-full bg-white dark:bg-[#050505] border-2 border-neutral-800 dark:border-white overflow-hidden flex flex-col transition-colors duration-300">
              <div className="relative z-10 h-full overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                {installationStatusLoading ? (
                  <div className="space-y-8">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-6 border-b-2 border-neutral-800/10 dark:border-white/10"
                      >
                        <div className="flex items-center space-x-4">
                          <Skeleton className="w-10 h-10 rounded-none bg-neutral-800/10 dark:bg-white/10" />
                          <div className="space-y-3">
                            <Skeleton className="w-40 h-5 bg-neutral-800/10 dark:bg-white/10 rounded-none" />
                            <Skeleton className="w-24 h-3 bg-neutral-800/10 dark:bg-white/10 rounded-none" />
                          </div>
                        </div>
                        <Skeleton className="w-24 h-12 bg-neutral-800/10 dark:bg-white/10 rounded-none" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <TransitionWrapper
                    isTransitioning={isTransitioning}
                    identifier={isImportState ? "import" : "form"}
                    className={isImportState ? "h-full flex flex-col" : ""}
                  >
                    {isImportState ? (
                      <PrivateRepoImport
                        userData={userData}
                        privateRepoData={allRepos}
                        repoDataLoading={repoDataLoading}
                        repoDataError={repoDataError}
                        totalListedProjectsDataLoading={
                          totalListedProjectsDataLoading
                        }
                        totalListedProjectsData={totalListedProjectsData}
                        setFormPropsAndSwitchUI={(props) =>
                          handleUIStateChange(false, props)
                        }
                        handleRefresh={handleRefresh}
                        isRefreshing={isRefreshing}
                        fetchNextPage={fetchNextPage}
                        hasNextPage={hasNextPage ?? false}
                        isFetchingNextPage={isFetchingNextPage}
                      />
                    ) : (
                      <ProjectListingForm
                        formProps={formProps}
                        setFormPropsAndSwitchUI={(props) =>
                          handleUIStateChange(true, props)
                        }
                        handleGetPreSignedUrls={handleGetPreSignedUrls}
                        handleValidateUploadAndStoreProject={
                          handleValidateUploadAndStoreProject
                        }
                        setActiveTab={setActiveTab}
                      />
                    )}
                  </TransitionWrapper>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
