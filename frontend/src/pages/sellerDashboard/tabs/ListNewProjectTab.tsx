import { useState } from "react";
import { useRecoilState } from "recoil";
import { user } from "@/utils/atom";
import {
  usePrivateReposQuery,
  useTotalListedProjectsQuery,
} from "@/hooks/apiQueries";
import {
  PrivateRepoData,
  projectListingValidatedFormData,
  ProjectMediaMetadata,
  SellerDashboardTabTypes,
} from "../utils/types";
import PrivateRepoImport from "../main-components/PrivateRepoImport";
import ProjectListingForm from "../main-components/ProjectListingForm";
import { TransitionWrapper } from "../sub-components/TransitionWrapper";
import {
  usePreSignedUrlForProjectMediaUploadMutation,
  useValidateMediaUploadAndStoreProjectMutation,
} from "@/hooks/apiMutations";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import { FolderPlus } from "lucide-react";

interface ListNewProjectTabProps {
  logout?: () => Promise<void>;
  setActiveTab: (curr: SellerDashboardTabTypes) => void;
}

export default function ListNewProjectTab({
  logout,
  setActiveTab,
}: ListNewProjectTabProps) {
  const [userData] = useRecoilState(user);
  const [isImportState, setIsImportState] = useState<boolean>(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formProps, setFormProps] = useState<PrivateRepoData>({
    name: "",
    description: "",
    language: "",
    updated_at: "",
    github_repo_id: "",
  });
  const [repoRefreshStatus, setRepoRefreshStatus] = useState<string>("false");

  const {
    data: totalListedProjectsData,
    isLoading: totalListedProjectsDataLoading,
  } = useTotalListedProjectsQuery({ logout });

  const {
    data: repoData,
    isLoading: repoDataLoading,
    isError: repoDataError,
    refetch,
  } = usePrivateReposQuery(repoRefreshStatus, { logout });

  const { mutateAsync: preSignedUrlMutate } =
    usePreSignedUrlForProjectMediaUploadMutation({
      logout,
    });

  const { mutateAsync: validationAndStoreMutate } =
    useValidateMediaUploadAndStoreProjectMutation({
      logout,
    });

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
    const currentRepoRefreshStatus = repoRefreshStatus;
    setRepoRefreshStatus("true");
    if (currentRepoRefreshStatus === "true") await refetch();
  };

  const handleGetPreSignedUrls = async (
    metadata: Array<ProjectMediaMetadata>,
    existingImageCount: number,
    existingVideoCount: number,
    modificationType: string
  ) => {
    const response = await preSignedUrlMutate({
      metadata,
      existingImageCount,
      existingVideoCount,
      modificationType,
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
        <div className="flex-shrink-0 mb-4 lg:mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <FolderPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl text-left font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                List New Project
              </h1>
              <p className="text-xs lg:text-sm text-gray-500">Import and list your project for sale</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-2xl rounded-3xl pointer-events-none" />
          <div className="relative h-full bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />
            
            <div className="relative z-10 h-full overflow-y-auto p-4 lg:p-6 custom-scrollbar">
              <TransitionWrapper
                isTransitioning={isTransitioning}
                identifier={isImportState ? "import" : "form"}
                className={isImportState ? "h-full flex flex-col" : ""}
              >
                {isImportState ? (
                  <PrivateRepoImport
                    userData={userData}
                    privateRepoData={
                      !repoDataLoading && !repoDataError && repoData
                        ? repoData.data
                        : []
                    }
                    repoDataLoading={repoDataLoading}
                    totalListedProjectsDataLoading={totalListedProjectsDataLoading}
                    totalListedProjectsData={totalListedProjectsData}
                    setFormPropsAndSwitchUI={(props) =>
                      handleUIStateChange(false, props)
                    }
                    handleRefresh={handleRefresh}
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
            </div>
          </div>
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
