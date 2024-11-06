import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { user } from "@/utils/atom";
import { usePrivateReposQuery } from "@/hooks/apiQueries";
import { PrivateRepoData } from "../utils/types";
import RepoImport from "../components/PrivateRepoImport";
import ProjectListingForm from "../components/ProjectListingForm";

export default function ListNewProjectTab() {
  const [userData] = useRecoilState(user);
  const [privateRepoData, setPrivateRepoData] = useState<
    Array<PrivateRepoData>
  >([]);
  const [isImportState, setIsImportState] = useState<boolean>(true);

  const { data: repoData, isLoading, isError } = usePrivateReposQuery();

  useEffect(() => {
    if (!isLoading && !isError && repoData) {
      setPrivateRepoData(repoData.data);
    }
  }, [repoData, isLoading, isError]);

  return (
    <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
      <h1 className="text-4xl text-center pb-2 md:text-left lg:text-left font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
        List New Project
      </h1>

      {isImportState ? (
        <RepoImport
          userData={userData}
          privateRepoData={privateRepoData}
          isLoading={isLoading}
          setIsImportState={setIsImportState}
        />
      ) : (
        <ProjectListingForm />
      )}
    </div>
  );
}
