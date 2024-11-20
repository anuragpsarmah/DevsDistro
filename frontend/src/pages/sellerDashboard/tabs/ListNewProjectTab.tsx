import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { user } from "@/utils/atom";
import { usePrivateReposQuery } from "@/hooks/apiQueries";
import {
  PrivateRepoData,
  projectListingValidatedFormData,
  ProjectMediaMetadata,
} from "../utils/types";
import RepoImport from "../components/PrivateRepoImport";
import ProjectListingForm from "../components/ProjectListingForm";
import { TransitionWrapper } from "../components/TransitionWrapper";
import {
  usePreSignedUrlForProjectMediaUploadMutation,
  useValidateMediaUploadAndStoreProjectMutation,
} from "@/hooks/apiMutations";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";

interface ListNewProjectTabProps {
  logout?: () => Promise<void>;
  setActiveTab: (curr: string) => void;
}

export default function ListNewProjectTab({
  logout,
  setActiveTab,
}: ListNewProjectTabProps) {
  const [userData] = useRecoilState(user);
  const [privateRepoData, setPrivateRepoData] = useState<
    Array<PrivateRepoData>
  >([]);
  const [isImportState, setIsImportState] = useState<boolean>(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formProps, setFormProps] = useState<PrivateRepoData>({
    name: "",
    description: "",
    language: "",
    updated_at: "",
  });
  const [repoRefreshStatus, setRepoRefreshStatus] = useState<string>("false");

  const {
    data: repoData,
    isLoading,
    isError,
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

  useEffect(() => {
    if (!isLoading && !isError && repoData) {
      setPrivateRepoData(repoData.data);
    }
  }, [repoData, isLoading, isError]);

  const handleStateChange = (
    newState: boolean,
    newFormProps?: PrivateRepoData
  ) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsImportState(newState);
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
    metadata: Array<ProjectMediaMetadata>
  ) => {
    const response = await preSignedUrlMutate(metadata);
    return response;
  };

  const handleValidateUploadAndStoreProject = async (
    formData: projectListingValidatedFormData
  ) => {
    const response = await validationAndStoreMutate(formData);
    return response;
  };

  return (
    <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
      <AnimatedLoadWrapper>
        <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
          List New Project
        </h1>
      </AnimatedLoadWrapper>

      <TransitionWrapper
        isTransitioning={isTransitioning}
        identifier={isImportState ? "import" : "form"}
      >
        {isImportState ? (
          <RepoImport
            userData={userData}
            privateRepoData={privateRepoData}
            isLoading={isLoading}
            setFormProps={(props) => handleStateChange(false, props)}
            handleRefresh={handleRefresh}
          />
        ) : (
          <ProjectListingForm
            formProps={formProps}
            setFormProps={(props) => handleStateChange(true, props)}
            handleGetPreSignedUrls={handleGetPreSignedUrls}
            handleValidateUploadAndStoreProject={
              handleValidateUploadAndStoreProject
            }
            setActiveTab={setActiveTab}
          />
        )}
      </TransitionWrapper>
    </div>
  );
}
