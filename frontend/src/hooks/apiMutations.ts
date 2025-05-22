import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { successToast } from "@/components/ui/customToast";
import {
  ProfileUpdateData,
  projectListingValidatedFormData,
  ProjectMediaMetadata,
} from "@/utils/types";
import { useHandleError } from "./useHandleErrors";

const backend_uri = import.meta.env.VITE_BACKEND_URI;

interface mutationParameter {
  logout?: () => Promise<void>;
}

const useProfileUpdateMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      try {
        const response = await axios.put(
          `${backend_uri}/profile/updateProfileInformation`,
          data,
          { withCredentials: true }
        );
        successToast("Profile updated successfully");
        return response.data;
      } catch (error) {
        handleError(error);
      }
    },
  });
};

const usePreSignedUrlForProjectMediaUploadMutation = ({
  logout,
}: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

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
      try {
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
      }
    },
  });
};

const useValidateMediaUploadAndStoreProjectMutation = ({
  logout,
}: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  return useMutation({
    mutationFn: async ({
      projectData,
      modificationType,
    }: {
      projectData: projectListingValidatedFormData;
      modificationType: string;
    }) => {
      try {
        const response = await axios.put(
          `${backend_uri}/projects/validateMediaUploadAndStoreProject`,
          { projectData, modificationType },
          { withCredentials: true }
        );
        return response.data;
      } catch (error) {
        handleError(error);
      }
    },
  });
};

const useToggleProjectListingMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  return useMutation({
    mutationFn: async (title: string) => {
      try {
        const response = await axios.patch(
          `${backend_uri}/projects/toggleProjectListing`,
          { title },
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
      }
    },
  });
};

const useDeleteProjectListingMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  return useMutation({
    mutationFn: async (title: string) => {
      try {
        await axios.delete(
          `${backend_uri}/projects/deleteProjectListing?title=${title}`,
          { withCredentials: true }
        );
        successToast("Project was unlisted permanantly");
        return true;
      } catch (error) {
        handleError(error);
        return false;
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

      try {
        operationInProgress = true;

        const response = await axios.put(
          `${backend_uri}/profile/updateWalletAddress`,
          { wallet_address },
          { withCredentials: true }
        );

        successToast(
          response.data.message || "Wallet address updated successfully"
        );

        return response.data;
      } catch (error) {
        handleError(error);
      } finally {
        setTimeout(() => {
          operationInProgress = false;

          queryClient.invalidateQueries({
            queryKey: ["getWalletAddressQuery"],
          });
        }, 300);
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
