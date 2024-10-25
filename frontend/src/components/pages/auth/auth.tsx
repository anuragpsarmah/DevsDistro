import { useState, useEffect } from "react";
import BackgroundDots from "../../ui/backgroundDots";
import { GithubIcon } from "lucide-react";

export default function Auth() {
  const [mounted, setMounted] = useState(false);
  const clientID = import.meta.env.VITE_GITHUB_CLIENT_ID;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async () => {
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientID}&scope=read:user,repo`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 relative overflow-hidden">
      {mounted && <BackgroundDots />}

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-4 relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
              DevExchange
            </span>
          </h1>
          <p className="text-xl text-gray-300 font-light">
            Your Marketplace for Innovative GitHub Projects
          </p>
        </div>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-8 shadow-2xl relative overflow-hidden border border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 z-0"></div>

          <h2 className="text-3xl font-bold mb-6 relative z-10 text-center">
            Join DevExchange
          </h2>

          <p className="text-gray-300 mb-8 relative z-10 text-center">
            Connect your GitHub account to start exploring.
          </p>

          <button
            className="w-full inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-0 focus:border-transparent text-white overflow-hidden text-lg font-semibold hover:cursor-pointer relative z-10 hover:brightness-150"
            onClick={handleLogin}
          >
            <GithubIcon className="mr-2 h-5 w-5" />
            <span>Continue with GitHub</span>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20"></div>
          </button>

          <div className="mt-8 text-center text-sm text-gray-400 relative z-10">
            By signing up, you agree to our
            <a href="#" className="text-blue-400 hover:underline ml-1">
              Terms of Service
            </a>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Developed by{" "}
            <span className="text-white">
              <a
                target="_blank"
                href="https://www.linkedin.com/in/anuragpsarmah/"
              >
                Anurag
              </a>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
