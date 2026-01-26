import { useState } from "react";
import { TransitionWrapper } from "../sub-components/TransitionWrapper";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import {
  useInitialProjectDataQuery,
  useSpecificProjectDataQuery,
} from "@/hooks/apiQueries";
import ListedProjects from "../main-components/ListedProjects";
import {
  useDeleteProjectListingMutation,
  usePreSignedUrlForProjectMediaUploadMutation,
  useToggleProjectListingMutation,
  useValidateMediaUploadAndStoreProjectMutation,
} from "@/hooks/apiMutations";
import { tryCatch } from "@/utils/tryCatch.util";
import ProjectModificationForm from "../main-components/ProjectModificationForm";
import { formPropsType } from "../utils/types";
import {
  projectListingValidatedFormData,
  ProjectMediaMetadata,
} from "../utils/types";

interface ManageProjectsTabProps {
  logout?: () => Promise<void>;
}

export default function ManageProjectsTab({ logout }: ManageProjectsTabProps) {
  const [componentIdentifier, setComponenetIdentifier] =
    useState<boolean>(true);
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
    if (identifier == "projects") {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setComponenetIdentifier(true);
    } else setComponenetIdentifier(false);
    if (identifier == "form") {
      const [data, error] = await tryCatch(() => getData(repo_id || ""));

      if (error) {
        setComponenetIdentifier(true);
      } else {
        setFormProps((prev) => {
          return { ...prev, ...data?.data };
        });
      }
    }
    setIsTransitioning(false);
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
      <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
        <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
          Manage Projects
        </h1>

        <TransitionWrapper
          isTransitioning={isTransitioning}
          identifier={componentIdentifier ? "projects" : "form"}
        >
          {componentIdentifier ? (
            <ListedProjects
              initialProjectData={initialData?.data}
              isLoading={initialDataLoading}
              isError={initialDataError}
              handleToggleProjectListing={handleToggleProjectListing}
              handleDeleteProjectListing={handleDeleteProjectListing}
              handleUIStateChange={handleUIStateChange}
              setFormProps={setFormProps}
            />
          ) : (
            <ProjectModificationForm
              formProps={formProps}
              setFormProps={setFormProps}
              handleUIStateChange={handleUIStateChange}
              handleGetPreSignedUrls={handleGetPreSignedUrls}
              handleValidateUploadAndStoreProject={
                handleValidateUploadAndStoreProject
              }
            />
          )}
        </TransitionWrapper>
      </div>
    </AnimatedLoadWrapper>
  );
}
