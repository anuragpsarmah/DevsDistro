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
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="relative bg-white dark:bg-[#050505] p-10 border-2 border-black dark:border-white transition-colors duration-300">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 border-2 border-black dark:border-white flex items-center justify-center mb-6 transition-colors duration-300">
              <Github className="w-8 h-8 text-black dark:text-white transition-colors duration-300" />
            </div>

            <h2 className="font-syne text-2xl font-bold uppercase tracking-wider text-black dark:text-white mb-4 transition-colors duration-300">
              Connect Your Repositories
            </h2>

            <p className="font-space text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed transition-colors duration-300">
              Install the DevsDistro GitHub App on your personal GitHub
              account to grant access to specific repositories you want to
              list for sale.
            </p>

            <div className="w-full space-y-4 mb-8">
              <div className="flex items-center gap-4 p-4 bg-transparent border-2 border-black/20 dark:border-white/20 transition-colors duration-300 text-left">
                <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                  <CheckCircle className="w-4 h-4 text-black dark:text-white transition-colors duration-300" />
                </div>
                <p className="font-space text-[10px] font-bold uppercase tracking-widest text-black dark:text-white transition-colors duration-300">
                  Choose exactly which repositories to share
                </p>
              </div>

              <div className="flex items-center gap-4 p-4 bg-transparent border-2 border-black/20 dark:border-white/20 transition-colors duration-300 text-left">
                <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                  <Shield className="w-4 h-4 text-black dark:text-white transition-colors duration-300" />
                </div>
                <p className="font-space text-[10px] font-bold uppercase tracking-widest text-black dark:text-white transition-colors duration-300">
                  We never access repos you don't explicitly grant
                </p>
              </div>

              <div className="flex items-center gap-4 p-4 bg-transparent border-2 border-black/20 dark:border-white/20 transition-colors duration-300 text-left">
                <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                  <Github className="w-4 h-4 text-black dark:text-white transition-colors duration-300" />
                </div>
                <p className="font-space text-[10px] font-bold uppercase tracking-widest text-black dark:text-white transition-colors duration-300">
                  Revoke access anytime from GitHub settings
                </p>
              </div>
            </div>

            <Button
              onClick={handleInstallClick}
              className="w-full bg-black text-white dark:bg-white dark:text-black font-space font-bold uppercase tracking-widest text-xs rounded-none border-2 border-transparent hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white hover:border-black dark:hover:border-white transition-colors duration-300 py-6 group"
            >
              <Github className="w-5 h-5 mr-3" />
              <span>Install GitHub App</span>
              <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>

            <p className="font-space text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-6 transition-colors duration-300">
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
  );
}
