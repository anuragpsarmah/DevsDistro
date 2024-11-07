import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { user } from "@/utils/atom";
import { usePrivateReposQuery } from "@/hooks/apiQueries";
import { PrivateRepoData } from "../utils/types";
import RepoImport from "../components/PrivateRepoImport";
import ProjectListingForm from "../components/ProjectListingForm";
import { motion } from "framer-motion";
import { TransitionWrapper } from "../components/TransitionWrapper";

export default function ListNewProjectTab() {
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

  const { data: repoData, isLoading, isError } = usePrivateReposQuery();

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

  return (
    <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
      <motion.h1
        className="text-4xl text-center pb-2 md:text-left lg:text-left font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        List New Project
      </motion.h1>

      <TransitionWrapper
        isTransitioning={isTransitioning}
        identifier={isImportState ? "import" : "form"}
      >
        {isImportState ? (
          <RepoImport
            userData={userData}
            privateRepoData={privateRepoData}
            isLoading={isLoading}
            setIsImportState={(state) => handleStateChange(state)}
            setFormProps={(props) => handleStateChange(false, props)}
          />
        ) : (
          <ProjectListingForm
            formProps={formProps}
            setFormProps={setFormProps}
            setIsImportState={(state) => handleStateChange(state)}
          />
        )}
      </TransitionWrapper>
    </div>
  );
}
