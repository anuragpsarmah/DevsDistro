import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TransitionWrapper } from "../sub-components/TransitionWrapper";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import {
  useInitialProjectDataQuery,
  useGetWalletAddress,
  useSpecificProjectDataQuery,
  useRepoZipStatusQuery,
} from "@/hooks/apiQueries";
import ListedProjects from "../main-components/ListedProjects";
import SellerProjectReviewsView from "../main-components/SellerProjectReviewsView";
import {
  useDeleteProjectListingMutation,
  usePreSignedUrlForProjectMediaUploadMutation,
  useToggleProjectListingMutation,
  useValidateMediaUploadAndStoreProjectMutation,
  useRetryRepoZipUploadMutation,
  useRefreshRepoZipMutation,
} from "@/hooks/apiMutations";
import { tryCatch } from "@/utils/tryCatch.util";
import ProjectModificationForm from "../main-components/ProjectModificationForm";
import { formPropsType } from "../utils/types";
import {
  projectListingValidatedFormData,
  ProjectMediaMetadata,
  SellerDashboardTabTypes,
} from "../utils/types";
import { ManageProjectsTabProps } from "@/utils/types";

type ManageView = "projects" | "form" | "reviews";

interface ManageProjectsTabViewProps extends ManageProjectsTabProps {
  setActiveTab: (tab: SellerDashboardTabTypes) => void;
}

export default function ManageProjectsTab({
  logout,
  setActiveTab,
}: ManageProjectsTabViewProps) {
  const queryClient = useQueryClient();
  const [componentIdentifier, setComponenetIdentifier] =
    useState<ManageView>("projects");
  const [reviewsProject, setReviewsProject] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formProps, setFormProps] = useState<formPropsType>({
    github_repo_id: "",
    isActive: false,
    title: "",
    description: "",
    tech_stack: [],
    live_link: "",
    price: 0,
    project_images: [],
    project_type: "",
    project_video: "",
  });

  const {
    data: initialData,
    isLoading: initialDataLoading,
    isError: initialDataError,
  } = useInitialProjectDataQuery({ logout });
  const {
    data: walletData,
    isLoading: walletAddressLoading,
    isError: walletAddressError,
  } = useGetWalletAddress({ logout });

  const getData = useSpecificProjectDataQuery({ logout });

  const { mutateAsync: toggleListingMutate } = useToggleProjectListingMutation({
    logout,
  });

  const { mutateAsync: deleteProjectMutate } = useDeleteProjectListingMutation({
    logout,
  });

  const { mutateAsync: preSignedUrlMutate } =
    usePreSignedUrlForProjectMediaUploadMutation({
      logout,
    });

  const { mutateAsync: validationAndStoreMutate } =
    useValidateMediaUploadAndStoreProjectMutation({
      logout,
    });

  const { mutateAsync: retryRepoZipMutate } = useRetryRepoZipUploadMutation({
    logout,
  });

  const { mutateAsync: refreshRepoZipMutate } = useRefreshRepoZipMutation({
    logout,
  });

  const getRepoZipStatus = useRepoZipStatusQuery({ logout });

  const handleToggleProjectListing = async (title: string) => {
    const response = await toggleListingMutate(title);
    return response;
  };

  const handleDeleteProjectListing = async (title: string) => {
    const response = await deleteProjectMutate(title);
    return response;
  };

  const handleUIStateChange = async (
    identifier: string,
    repo_id: string = ""
  ) => {
    setIsTransitioning(true);
    if (identifier === "projects") {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setComponenetIdentifier("projects");
    } else if (identifier === "reviews") {
      setComponenetIdentifier("reviews");
    } else {
      setComponenetIdentifier("form");
    }
    if (identifier === "form") {
      const [data, error] = await tryCatch(() => getData(repo_id || ""));

      if (error) {
        setComponenetIdentifier("projects");
      } else {
        setFormProps((prev) => {
          return { ...prev, ...data?.data };
        });
      }
    }
    setIsTransitioning(false);
  };

  const handleViewReviews = (projectId: string, projectTitle: string) => {
    setReviewsProject({ id: projectId, title: projectTitle });
    handleUIStateChange("reviews");
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

  const handleRetryRepoZipUpload = async (github_repo_id: string) => {
    await retryRepoZipMutate(github_repo_id);
  };

  const handleRefreshRepoZip = async (github_repo_id: string) => {
    await refreshRepoZipMutate(github_repo_id);
  };

  const handleRefreshRepoZipStatus = async (
    index: number
  ): Promise<string | null> => {
    const github_repo_id = initialData?.data?.[index]?.github_repo_id;
    if (!github_repo_id) return null;

    const result = await getRepoZipStatus(github_repo_id);
    const status: string | null = result?.data?.repo_zip_status ?? null;
    if (status === "SUCCESS") {
      queryClient.invalidateQueries({ queryKey: ["initialProjectDataQuery"] });
    }
    return status;
  };

  const existingWalletAddress = walletData?.data?.wallet_address;
  const showWalletConnectionNotice =
    Boolean(initialData?.data?.length) &&
    !walletAddressLoading &&
    !walletAddressError &&
    !existingWalletAddress;

  return (
    <AnimatedLoadWrapper>
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6">
        <div className="flex-shrink-0 mb-8 lg:mb-10 w-full">
          <div className="flex items-center gap-3 mb-6 w-full">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              My Projects
            </span>
          </div>
          <div className="text-left w-full max-w-4xl">
            <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-black dark:text-white leading-none break-words hyphens-auto transition-colors duration-300">
              Manage Projects
            </h1>
            <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
              View and modify your listed projects.
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative overflow-hidden transition-colors duration-300">
          <TransitionWrapper
            isTransitioning={isTransitioning}
            identifier={componentIdentifier}
            className="h-full"
          >
            {componentIdentifier === "projects" ? (
              <div className="h-full overflow-y-auto custom-scrollbar">
                <ListedProjects
                  initialProjectData={initialData?.data}
                  isLoading={initialDataLoading}
                  isError={initialDataError}
                  showWalletConnectionNotice={showWalletConnectionNotice}
                  onNavigateToWallet={() => setActiveTab("Wallet")}
                  handleToggleProjectListing={handleToggleProjectListing}
                  handleDeleteProjectListing={handleDeleteProjectListing}
                  handleUIStateChange={handleUIStateChange}
                  handleRetryRepoZipUpload={handleRetryRepoZipUpload}
                  handleRefreshRepoZipStatus={handleRefreshRepoZipStatus}
                  handleRefreshRepoZip={handleRefreshRepoZip}
                  setFormProps={setFormProps}
                  onViewReviews={handleViewReviews}
                />
              </div>
            ) : componentIdentifier === "reviews" ? (
              <div className="relative h-full bg-white dark:bg-[#050505] border-2 border-black dark:border-white overflow-hidden flex flex-col transition-colors duration-300">
                <div className="relative z-10 h-full overflow-y-auto custom-scrollbar p-6 lg:p-10">
                  <SellerProjectReviewsView
                    projectId={reviewsProject!.id}
                    projectTitle={reviewsProject!.title}
                    onBack={() => handleUIStateChange("projects")}
                  />
                </div>
              </div>
            ) : (
              <div className="relative h-full bg-white dark:bg-[#050505] border-2 border-black dark:border-white overflow-hidden flex flex-col transition-colors duration-300">
                <div className="relative z-10 h-full overflow-y-auto custom-scrollbar p-6 lg:p-10">
                  <ProjectModificationForm
                    key={formProps.github_repo_id}
                    formProps={formProps}
                    setFormProps={setFormProps}
                    handleUIStateChange={handleUIStateChange}
                    handleGetPreSignedUrls={handleGetPreSignedUrls}
                    handleValidateUploadAndStoreProject={
                      handleValidateUploadAndStoreProject
                    }
                  />
                </div>
              </div>
            )}
          </TransitionWrapper>
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
