import { Github, Shield, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubAppInstallPromptProps } from "../utils/types";

export default function GitHubAppInstallPrompt({
  installUrl,
}: GitHubAppInstallPromptProps) {
  const handleInstallClick = () => {
    window.location.href = installUrl;
  };

  return (
    <div className="h-full overflow-y-auto hide-scrollbar-if-needed">
      <div className="min-h-full flex flex-col items-center justify-center p-4 lg:p-6">
        <div className="w-full max-w-2xl">
          <div className="relative bg-white dark:bg-[#050505] p-6 lg:p-10 border-2 border-neutral-800 dark:border-white transition-colors duration-300">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 border-2 border-neutral-800 dark:border-white flex items-center justify-center mb-4 lg:mb-6 transition-colors duration-300">
                <Github className="w-7 h-7 text-neutral-800 dark:text-white transition-colors duration-300" />
              </div>

              <h2 className="font-syne text-2xl font-bold uppercase tracking-wider text-neutral-800 dark:text-white mb-3 lg:mb-4 transition-colors duration-300">
                Connect Your Repositories
              </h2>

              <p className="font-space text-sm text-gray-600 dark:text-gray-400 mb-5 lg:mb-8 leading-relaxed transition-colors duration-300">
                Install the DevsDistro GitHub App on your personal GitHub
                account to grant access to specific repositories you want to
                list for sale.
              </p>

              <div className="w-full space-y-3 mb-5 lg:mb-8">
                <div className="flex items-center gap-4 py-3 px-4 bg-transparent border-2 border-neutral-800/20 dark:border-white/20 transition-colors duration-300 text-left">
                  <div className="w-8 h-8 border-2 border-neutral-800/20 dark:border-white/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                    <CheckCircle className="w-4 h-4 text-neutral-800 dark:text-white transition-colors duration-300" />
                  </div>
                  <p className="font-space text-[10px] font-bold uppercase tracking-widest text-neutral-800 dark:text-white transition-colors duration-300">
                    Choose exactly which repositories to share
                  </p>
                </div>

                <div className="flex items-center gap-4 py-3 px-4 bg-transparent border-2 border-neutral-800/20 dark:border-white/20 transition-colors duration-300 text-left">
                  <div className="w-8 h-8 border-2 border-neutral-800/20 dark:border-white/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                    <Shield className="w-4 h-4 text-neutral-800 dark:text-white transition-colors duration-300" />
                  </div>
                  <p className="font-space text-[10px] font-bold uppercase tracking-widest text-neutral-800 dark:text-white transition-colors duration-300">
                    We never access repos you don't explicitly grant
                  </p>
                </div>

                <div className="flex items-center gap-4 py-3 px-4 bg-transparent border-2 border-neutral-800/20 dark:border-white/20 transition-colors duration-300 text-left">
                  <div className="w-8 h-8 border-2 border-neutral-800/20 dark:border-white/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                    <Github className="w-4 h-4 text-neutral-800 dark:text-white transition-colors duration-300" />
                  </div>
                  <p className="font-space text-[10px] font-bold uppercase tracking-widest text-neutral-800 dark:text-white transition-colors duration-300">
                    Revoke access anytime from GitHub settings
                  </p>
                </div>
              </div>

              <Button
                onClick={handleInstallClick}
                className="w-full bg-neutral-800 text-white dark:bg-white dark:text-neutral-800 font-space font-bold uppercase tracking-widest text-xs rounded-none border-2 border-transparent hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white hover:border-neutral-800 dark:hover:border-white transition-colors duration-300 py-5 lg:py-6 group"
              >
                <Github className="w-5 h-5 mr-3" />
                <span>Install GitHub App</span>
                <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>

              <p className="font-space text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-4 lg:mt-6 transition-colors duration-300">
                You'll be redirected to GitHub to configure access.
                <br />
                <span className="text-red-500 mt-2 block">
                  NOTE: ORGANIZATION ACCOUNTS ARE NOT SUPPORTED.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
