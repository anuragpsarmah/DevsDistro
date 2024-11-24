import { useMutation } from "@tanstack/react-query";
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
    mutationFn: async (data: Array<ProjectMediaMetadata>) => {
      try {
        const response = await axios.post(
          `${backend_uri}/projects/getPreSignedUrlForProjectMediaUpload`,
          { metadata: data },
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
    mutationFn: async (data: projectListingValidatedFormData) => {
      try {
        const response = await axios.put(
          `${backend_uri}/projects/validateMediaUploadAndStoreProject`,
          data,
          { withCredentials: true }
        );
        return response.data;
      } catch (error) {
        handleError(error);
      }
    },
  });
};

export {
  useProfileUpdateMutation,
  usePreSignedUrlForProjectMediaUploadMutation,
  useValidateMediaUploadAndStoreProjectMutation,
};
