import { useEffect } from "react";
import { motion } from "framer-motion";
import axios, { AxiosResponse } from "axios";
import { tryCatch } from "@/utils/tryCatch.util";
import { useNavigate } from "react-router-dom";
import { user } from "@/utils/atom";
import { useRecoilState } from "recoil";
import BackgroundDots from "@/components/ui/backgroundDots";
import { errorToast } from "@/components/ui/customToast";

export default function LoginValidationPage() {
  const [, setActiveUser] = useRecoilState(user);
  const navigate = useNavigate();
  const url = new URL(window.location.href);
  const githubCode = url.searchParams.get("code");
  const backend_uri = import.meta.env.VITE_BACKEND_URI;

  useEffect(() => {
    const validateLogin = async () => {
      const [response, error] = await tryCatch<AxiosResponse>(() =>
        axios.get(
          `${backend_uri}/auth/githubLogin?code=${githubCode}`,
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

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4 relative overflow-hidden bg-[#030712]">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 0%, rgba(88, 28, 135, 0.15) 0%, transparent 60%),
            radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.05) 0%, transparent 40%),
            #030712
          `,
        }}
      />

      <BackgroundDots />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="z-10 text-center"
      >
        <motion.div
          className="mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[3px]">
            <div className="w-full h-full rounded-full bg-[#030712] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-500" />
            </div>
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            Authenticating
          </span>
        </h1>
        <p className="text-sm text-gray-400">
          Connecting to GitHub...
        </p>
      </motion.div>
    </div>
  );
}
