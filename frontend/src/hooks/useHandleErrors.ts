import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { errorToast } from "@/components/ui/customToast";

interface useHandleErrorParameter {
  logout?: () => Promise<void>;
}

export const useHandleError = ({ logout }: useHandleErrorParameter) => {
  const navigate = useNavigate();

  const handleError = async (error: unknown) => {
    if (error instanceof AxiosError) {
      if (error?.response?.status === 401 && logout) {
        await logout();
        navigate("/");
      } else {
        errorToast(error?.response?.data?.message || "Something went wrong");
      }
    } else {
      errorToast("Something went wrong");
    }
  };

  return { handleError };
};
