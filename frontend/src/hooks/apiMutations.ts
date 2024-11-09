import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { successToast } from "@/components/ui/customToast";
import { ProfileUpdateData } from "@/types/types";
import { useHandleError } from "./useHandleErrors";

const backend_uri = import.meta.env.VITE_BACKEND_URI;

interface mutationParameter {
  logout?: () => Promise<void>;
}

const useProfileUpdateMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      const response = await axios.put(
        `${backend_uri}/profile/updateProfileInformation`,
        data,
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: () => {
      successToast("Profile updated successfully");
    },
    onError: (error) => {
      handleError(error);
    },
  });
};

export { useProfileUpdateMutation };
