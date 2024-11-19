import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { user } from "@/utils/atom";
import { usePrivateReposQuery } from "@/hooks/apiQueries";
import { PrivateRepoData, ProjectMediaMetadata } from "../utils/types";
import RepoImport from "../components/PrivateRepoImport";
import ProjectListingForm from "../components/ProjectListingForm";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { usePreSignedUrlForProjectMediaUploadMutation } from "@/hooks/apiMutations";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";

interface ListNewProjectTabProps {
  logout?: () => Promise<void>;
}

export default function ListNewProjectTab({ logout }: ListNewProjectTabProps) {
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

  const { mutateAsync } = usePreSignedUrlForProjectMediaUploadMutation({
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
    const response = await mutateAsync(metadata);
    return response;
  };

  return (
    <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
      <AnimatedLoadWrapper>List New Project</AnimatedLoadWrapper>

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
          />
        )}
      </TransitionWrapper>
    </div>
  );
}
