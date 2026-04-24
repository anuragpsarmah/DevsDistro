import { useEffect } from "react";
import { AxiosResponse } from "axios";
import { apiClient } from "@/lib/axiosInstance";
import { tryCatch } from "@/utils/tryCatch.util";
import { useNavigate } from "react-router-dom";
import { errorToast, successToast } from "@/components/ui/customToast";
import SEO from "@/components/seo/SEO";

export default function AppInstallCallbackPage() {
  const navigate = useNavigate();
  const url = new URL(window.location.href);
  const installationId = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");
  const state = url.searchParams.get("state");
  useEffect(() => {
    const handleInstallCallback = async () => {
      if (!installationId || !state) {
        errorToast("Invalid callback — missing parameters");
        navigate("/seller-dashboard", { state: { activeTab: "List Project" } });
        return;
      }

      const [response, error] = await tryCatch<AxiosResponse>(() =>
        apiClient.get(
          `/github-app/callback?installation_id=${installationId}&setup_action=${setupAction || ""}&state=${encodeURIComponent(state)}`
        )
      );

      if (error || !response) {
        console.error("Installation callback error:", error);
        const errorMessage =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Failed to configure GitHub App";
        errorToast(errorMessage);
        navigate("/seller-dashboard", { state: { activeTab: "List Project" } });
      } else {
        successToast("GitHub App installed successfully!");
        navigate("/seller-dashboard", { state: { activeTab: "List Project" } });
      }
    };

    handleInstallCallback();
  }, []);

  return (
    <div className="min-h-screen overflow-hidden w-full bg-white dark:bg-[#050505] text-neutral-800 dark:text-white font-space selection:bg-red-500 selection:text-white transition-colors duration-300 relative flex items-center justify-center p-4">
      <SEO
        title="Configuring Access"
        description="Completing the DevsDistro GitHub App installation flow."
        path="/app-install-callback"
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
          <h1 className="text-4xl sm:text-[4rem] md:text-[5rem] lg:text-[4.5rem] font-black uppercase tracking-widest leading-none font-syne w-max max-w-none bg-white dark:bg-[#050505] px-4 sm:px-8 whitespace-nowrap inline-block relative z-20">
            Configuring Access
          </h1>
        </div>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed font-space max-w-xl mx-auto border-t-2 border-neutral-800/10 dark:border-white/10 pt-6">
          CONNECTING REPOSITORIES. PLEASE STAND BY FOR CONFIGURATION...
        </p>
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-neutral-800 dark:bg-white -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-8 right-8 h-[2px] bg-neutral-800 dark:bg-white translate-y-1/2"></div>
      </div>
    </div>
  );
}
