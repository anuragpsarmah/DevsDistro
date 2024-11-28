import { useState } from "react";
import { TransitionWrapper } from "../components/TransitionWrapper";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import { useInitialProjectDataQuery } from "@/hooks/apiQueries";
import ListedProjects from "../components/ListedProjects";

interface ManageProjectsTabProps {
  logout?: () => Promise<void>;
}

export default function ManageProjectsTab({ logout }: ManageProjectsTabProps) {
  const [isProjectState, setIsImportState] = useState<boolean>(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const {
    data: initialData,
    isLoading: initialDataLoading,
    isError: initialDataError,
  } = useInitialProjectDataQuery({ logout });

  return (
    <AnimatedLoadWrapper>
      <>
        <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
          <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
            Manage Projects
          </h1>

          <TransitionWrapper
            isTransitioning={isTransitioning}
            identifier={isProjectState ? "projects" : "form"}
          >
            {isProjectState &&
            initialData &&
            !initialDataLoading &&
            !initialDataError ? (
              <ListedProjects initialProjectData={initialData.data} />
            ) : (
              <>asdasd</>
            )}
          </TransitionWrapper>
        </div>
      </>
    </AnimatedLoadWrapper>
  );
}
