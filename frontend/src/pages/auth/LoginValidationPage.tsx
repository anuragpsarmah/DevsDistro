import { useEffect } from "react";
import axios, { AxiosResponse } from "axios";
import { tryCatch } from "@/utils/tryCatch.util";
import { useNavigate } from "react-router-dom";
import { user } from "@/utils/atom";
import { useRecoilState } from "recoil";
import LoadingPage from "@/pages/loading/loading";
import { errorToast } from "@/components/ui/customToast";

export default function LoginValidationPage() {
  const [, setActiveUser] = useRecoilState(user);
  const navigate = useNavigate();
  const url = new URL(window.location.href);
  const githubCode = url.searchParams.get("code");

  useEffect(() => {
    const validateLogin = async () => {
      const [response, error] = await tryCatch<AxiosResponse>(() =>
        axios.get(
          `http://localhost:3000/api/auth/githubLogin?code=${githubCode}`,
          { withCredentials: true }
        )
      );

      if (error || !response) {
        console.log(error);
        errorToast("Error validating login");
        navigate("/authentication");
      } else {
        setActiveUser(response.data.data);
        navigate("/profile-selection");
      }
    };

    validateLogin();
  }, []);

  return <LoadingPage />;
}
