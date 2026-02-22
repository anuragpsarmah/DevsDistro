import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { successToast } from "@/components/ui/customToast";
import {
  ProfileUpdateData,
  projectListingValidatedFormData,
  ProjectMediaMetadata,
  WalletUpdatePayload,
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

      operationInProgress = true;

      const [response, error] = await tryCatch(
        axios.put(
          `${backend_uri}/profile/updateProfileInformation`,
          data,
          { withCredentials: true }
        )
      );

      setTimeout(() => {
        operationInProgress = false;
        queryClient.invalidateQueries({
          queryKey: ["useProfileInformationQuery"],
        });
      }, 300);

      if (error) {
        handleError(error);
        throw error;
      }
      successToast("Profile updated successfully");
      return response.data;
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

      operationInProgress = true;

      const [response, error] = await tryCatch(
        axios.post(
          `${backend_uri}/projects/getPreSignedUrlForProjectMediaUpload`,
          {
            metadata,
            existingImageCount,
            existingVideoCount,
            modificationType,
          },
          { withCredentials: true }
        )
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      return response.data;
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

      operationInProgress = true;

      const [response, error] = await tryCatch(
        axios.put(
          `${backend_uri}/projects/validateMediaUploadAndStoreProject`,
          { projectData, modificationType },
          { withCredentials: true }
        )
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      return response.data;
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

      operationInProgress = true;

      const [response, error] = await tryCatch(
        axios.patch(
          `${backend_uri}/projects/toggleProjectListing`,
          { github_repo_id },
          { withCredentials: true }
        )
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      successToast(
        response.data?.data?.status
          ? "Project was re-listed"
          : "Project was unlisted"
      );
      return response.data;
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

      operationInProgress = true;

      const [, error] = await tryCatch(
        axios.delete(
          `${backend_uri}/projects/deleteProjectListing?github_repo_id=${github_repo_id}`,
          { withCredentials: true }
        )
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        return false;
      }
      successToast("Project was unlisted permanantly");
      return true;
    },
  });
};

const useUpdateWalletAddressMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (data: WalletUpdatePayload | string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const payload =
        typeof data === "string"
          ? { wallet_address: data }
          : {
            wallet_address: data.address,
            signature: data.signature,
            message: data.message,
          };

      const [response, error] = await tryCatch(
        axios.put(`${backend_uri}/profile/updateWalletAddress`, payload, {
          withCredentials: true,
        })
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

const useRetryRepoZipUploadMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (github_repo_id: string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [response, error] = await tryCatch(
        axios.post(
          `${backend_uri}/projects/retryRepoZipUpload`,
          { github_repo_id },
          { withCredentials: true }
        )
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      successToast("Retry initiated");
      return response.data;
    },
  });
};

const useRefreshRepoZipMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (github_repo_id: string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [response, error] = await tryCatch(
        axios.post(
          `${backend_uri}/projects/refreshRepoZip`,
          { github_repo_id },
          { withCredentials: true }
        )
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      successToast("Repackage initiated");
      return response.data;
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
  useRetryRepoZipUploadMutation,
  useRefreshRepoZipMutation,
};
