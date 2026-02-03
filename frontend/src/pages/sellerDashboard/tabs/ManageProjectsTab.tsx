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
import { Layers } from "lucide-react";

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
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6">
        <div className="flex-shrink-0 mb-4 lg:mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl text-left font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Manage Projects
              </h1>
              <p className="text-xs lg:text-sm text-gray-500">View and modify your listed projects</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative overflow-hidden">
          <TransitionWrapper
            isTransitioning={isTransitioning}
            identifier={componentIdentifier ? "projects" : "form"}
            className="h-full"
          >
            {componentIdentifier ? (
              <div className="h-full overflow-y-auto custom-scrollbar">
                <ListedProjects
                  initialProjectData={initialData?.data}
                  isLoading={initialDataLoading}
                  isError={initialDataError}
                  handleToggleProjectListing={handleToggleProjectListing}
                  handleDeleteProjectListing={handleDeleteProjectListing}
                  handleUIStateChange={handleUIStateChange}
                  setFormProps={setFormProps}
                />
              </div>
            ) : (
              <div className="h-full relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-2xl rounded-3xl pointer-events-none" />
                <div className="relative h-full bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />
                  <div className="relative z-10 h-full overflow-y-auto p-4 lg:p-6 custom-scrollbar">
                    <ProjectModificationForm
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
              </div>
            )}
          </TransitionWrapper>
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
