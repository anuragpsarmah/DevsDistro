import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { successToast } from "@/components/ui/customToast";
import {
  ProfileUpdateData,
  projectListingValidatedFormData,
  ProjectMediaMetadata,
} from "@/utils/types";
import { useHandleError } from "./useHandleErrors";
import { tryCatch } from "@/utils/tryCatch.util";

const backend_uri = import.meta.env.VITE_BACKEND_URI;

interface mutationParameter {
  logout?: () => Promise<void>;
}

const useProfileUpdateMutation = ({ logout }: mutationParameter) => {
  const queryClient = useQueryClient();
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      try {
        operationInProgress = true;

        const response = await axios.put(
          `${backend_uri}/profile/updateProfileInformation`,
          data,
          { withCredentials: true }
        );
        successToast("Profile updated successfully");
        return response.data;
      } catch (error) {
        handleError(error);
      } finally {
        setTimeout(() => {
          operationInProgress = false;
          queryClient.invalidateQueries({
            queryKey: ["useProfileInformationQuery"],
          });
        }, 300);
      }
    },
  });
};

const usePreSignedUrlForProjectMediaUploadMutation = ({
  logout,
}: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async ({
      metadata,
      existingImageCount,
      existingVideoCount,
      modificationType,
    }: {
      metadata: Array<ProjectMediaMetadata>;
      existingImageCount: number;
      existingVideoCount: number;
      modificationType: string;
    }) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      try {
        operationInProgress = true;

        const response = await axios.post(
          `${backend_uri}/projects/getPreSignedUrlForProjectMediaUpload`,
          {
            metadata,
            existingImageCount,
            existingVideoCount,
            modificationType,
          },
          { withCredentials: true }
        );
        return response.data;
      } catch (error) {
        handleError(error);
      } finally {
        operationInProgress = false;
      }
    },
  });
};

const useValidateMediaUploadAndStoreProjectMutation = ({
  logout,
}: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async ({
      projectData,
      modificationType,
    }: {
      projectData: projectListingValidatedFormData;
      modificationType: string;
    }) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      try {
        operationInProgress = true;

        const response = await axios.put(
          `${backend_uri}/projects/validateMediaUploadAndStoreProject`,
          { projectData, modificationType },
          { withCredentials: true }
        );
        return response.data;
      } catch (error) {
        handleError(error);
      } finally {
        operationInProgress = false;
      }
    },
  });
};

const useToggleProjectListingMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (github_repo_id: string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      try {
        operationInProgress = true;

        const response = await axios.patch(
          `${backend_uri}/projects/toggleProjectListing`,
          { github_repo_id },
          { withCredentials: true }
        );
        successToast(
          response.data?.data?.status
            ? "Project was re-listed"
            : "Project was unlisted"
        );
        return response.data;
      } catch (error) {
        handleError(error);
      } finally {
        operationInProgress = false;
      }
    },
  });
};

const useDeleteProjectListingMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (github_repo_id: string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      try {
        operationInProgress = true;

        await axios.delete(
          `${backend_uri}/projects/deleteProjectListing?github_repo_id=${github_repo_id}`,
          { withCredentials: true }
        );
        successToast("Project was unlisted permanantly");
        return true;
      } catch (error) {
        handleError(error);
        return false;
      } finally {
        operationInProgress = false;
      }
    },
  });
};

const useUpdateWalletAddressMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (wallet_address: string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [response, error] = await tryCatch(
        axios.put(
          `${backend_uri}/profile/updateWalletAddress`,
          { wallet_address },
          { withCredentials: true }
        )
      );

      if (response) successToast("Wallet address updated successfully");

      setTimeout(() => {
        operationInProgress = false;

        queryClient.invalidateQueries({
          queryKey: ["getWalletAddressQuery"],
        });
      }, 300);

      if (error) {
        handleError(error);
        throw error;
      }
    },
  });
};

export {
  useProfileUpdateMutation,
  usePreSignedUrlForProjectMediaUploadMutation,
  useValidateMediaUploadAndStoreProjectMutation,
  useToggleProjectListingMutation,
  useDeleteProjectListingMutation,
  useUpdateWalletAddressMutation,
};
