import { useState } from "react";
import { TransitionWrapper } from "../components/TransitionWrapper";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import {
  useInitialProjectDataQuery,
  useSpecificProjectDataQuery,
} from "@/hooks/apiQueries";
import ListedProjects from "../components/ListedProjects";
import {
  useDeleteProjectListingMutation,
  useToggleProjectListingMutation,
} from "@/hooks/apiMutations";
import ProjectModificationForm from "../components/ProjectModificationForm";
import { formPropsType } from "../utils/types";

interface ManageProjectsTabProps {
  logout?: () => Promise<void>;
}

export default function ManageProjectsTab({ logout }: ManageProjectsTabProps) {
  const [componentIdentifier, setComponenetIdentifier] =
    useState<boolean>(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formProps, setFormProps] = useState<formPropsType>({
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

  const handleToggleProjectListing = async (title: string) => {
    const response = await toggleListingMutate(title);
    return response;
  };

  const handleDeleteProjectListing = async (title: string) => {
    const response = await deleteProjectMutate(title);
    return response;
  };

  const handleStateChange = async (identifier: string, title: string) => {
    setIsTransitioning(true);
    if (identifier == "projects") setComponenetIdentifier(true);
    else setComponenetIdentifier(false);

    try {
      const data = await getData(title || "");
      setFormProps((prev) => {
        return { ...prev, ...data?.data };
      });
      setIsTransitioning(false);
    } catch {
      setIsTransitioning(false);
      if (identifier == "projects") setComponenetIdentifier(false);
      else setComponenetIdentifier(true);
    }
  };

  return (
    <AnimatedLoadWrapper>
      <>
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
                handleStateChange={handleStateChange}
                setFormProps={setFormProps}
              />
            ) : (
              <ProjectModificationForm formProps={formProps} />
            )}
          </TransitionWrapper>
        </div>
      </>
    </AnimatedLoadWrapper>
  );
}
