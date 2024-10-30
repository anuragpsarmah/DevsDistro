import { useEffect } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { user } from "@/utils/atom";
import { useRecoilState } from "recoil";
import LoadingPage from "@/components/pages/loading/loading";

export default function LoginValidationPage() {
  const [, setActiveUser] = useRecoilState(user);
  const { toast } = useToast();
  const navigate = useNavigate();
  const url = new URL(window.location.href);
  const githubCode = url.searchParams.get("code");

  useEffect(() => {
    const validateLogin = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/auth/githubLogin?code=${githubCode}`,
          { withCredentials: true }
        );

        setActiveUser(response.data.data);
        navigate("/profile-selection");
      } catch (error) {
        console.log(error);
        toast({
          description: "Your message has been sent.",
        });
        navigate("/authentication");
      }
    };

    validateLogin();
  }, []);

  return <LoadingPage />;
}
