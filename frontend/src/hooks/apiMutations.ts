import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { successToast, errorToast } from "@/components/ui/customToast";
import { ProfileUpdateData } from "@/types/types";

const backend_uri = import.meta.env.VITE_BACKEND_URI;

const useProfileUpdateMutation = () => {
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
      errorToast(error.message || "Failed to update profile");
    },
  });
};

export { useProfileUpdateMutation };
