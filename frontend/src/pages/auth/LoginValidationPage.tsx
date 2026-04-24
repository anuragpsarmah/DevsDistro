import { useEffect, useRef } from "react";
import { AxiosError, AxiosResponse } from "axios";
import { apiClient } from "@/lib/axiosInstance";
import { tryCatch } from "@/utils/tryCatch.util";
import { useNavigate } from "react-router-dom";
import { user } from "@/utils/atom";
import { useRecoilState } from "recoil";
import { errorToast } from "@/components/ui/customToast";
import { isSafeRelativePath } from "@/utils/navigation";
import SEO from "@/components/seo/SEO";

export default function LoginValidationPage() {
  const [, setActiveUser] = useRecoilState(user);
  const navigate = useNavigate();
  const url = new URL(window.location.href);
  const githubCode = url.searchParams.get("code");
  const oauthState = url.searchParams.get("state");
  const hasValidated = useRef(false);

  useEffect(() => {
    if (hasValidated.current) return;
    hasValidated.current = true;

    const validateLogin = async () => {
      const [response, error] = await tryCatch<AxiosResponse>(() =>
        apiClient.get(
          `/auth/githubLogin?code=${githubCode}&state=${oauthState}`
        )
      );

      if (error || !response) {
        if (error instanceof AxiosError && error.response?.status === 403) {
          errorToast(
            error.response.data?.message ??
              "Account creation is currently restricted."
          );
        } else {
          errorToast("Error validating login");
        }
        navigate("/authentication");
      } else {
        const { user: userData, next } = response.data.data;
        setActiveUser(userData);
        const validNext = isSafeRelativePath(next) ? next : null;
        if (validNext) {
          navigate(`/profile-selection?next=${encodeURIComponent(validNext)}`);
        } else {
          navigate("/profile-selection");
        }
      }
    };

    validateLogin();
  }, [githubCode, oauthState, navigate, setActiveUser]);

  return (
    <div className="min-h-screen overflow-hidden w-full bg-white dark:bg-[#050505] text-neutral-800 dark:text-white font-space selection:bg-red-500 selection:text-white transition-colors duration-300 relative flex items-center justify-center p-4">
      <SEO
        title="Authenticating"
        description="Completing GitHub authentication for DevsDistro."
        path="/loginValidation"
        robots="noindex, nofollow"
      />
      <div className="z-10 text-center max-w-4xl mx-auto w-full flex flex-col items-center justify-center border-2 border-neutral-800 dark:border-white py-12 px-6 md:p-24 relative bg-white dark:bg-[#050505] shadow-[8px_8px_0px_0px_rgba(38,38,38,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-8 self-start">
          <div className="w-12 h-[2px] bg-red-500"></div>
          <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
            System Status
          </span>
        </div>
        <div className="mb-12">
          <div className="w-12 h-12 bg-red-500 animate-[pulse_1s_steps(2,start)_infinite]" />
        </div>

        <div className="relative flex justify-center w-full mb-6 z-20">
          <h1 className="text-4xl sm:text-[4rem] md:text-[5rem] lg:text-[6.5rem] font-black uppercase tracking-widest leading-none font-syne w-max max-w-none bg-white dark:bg-[#050505] px-4 sm:px-8 whitespace-nowrap inline-block relative z-20">
            Authenticating
          </h1>
        </div>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed font-space max-w-xl mx-auto border-t-2 border-neutral-800/10 dark:border-white/10 pt-6">
          CONNECTING TO GITHUB. PLEASE STAND BY FOR CREDENTIAL VALIDATION...
        </p>
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-neutral-800 dark:bg-white -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-8 right-8 h-[2px] bg-neutral-800 dark:bg-white translate-y-1/2"></div>
      </div>
    </div>
  );
}
