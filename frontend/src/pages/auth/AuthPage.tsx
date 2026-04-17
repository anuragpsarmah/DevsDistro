import { useEffect, useState } from "react";
import { GithubIcon, Code2, ArrowRight } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuthValidationQuery } from "@/hooks/apiQueries";
import { apiClient } from "@/lib/axiosInstance";
import { isSafeRelativePath } from "@/utils/navigation";
import Header from "@/pages/landing/components/header";
import MobileMenu from "@/pages/landing/components/mobileMenu";
import Footer from "@/pages/landing/components/footer";
import SEO from "@/components/seo/SEO";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = useAuthValidationQuery();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const nextParam = searchParams.get("next");
  const validNext = isSafeRelativePath(nextParam) ? nextParam : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleAuthValidation = async () => {
      if (!isLoading && !isError && data) {
        if (validNext) {
          navigate(`/profile-selection?next=${encodeURIComponent(validNext)}`);
        } else {
          navigate("/profile-selection");
        }
      }
    };

    handleAuthValidation();
  }, [isError, isLoading, data, navigate, validNext]);

  useEffect(() => {
    const handleResize = () => setIsMenuOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLoginClick = () => {
    const url = validNext
      ? `/auth/githubLoginStart?next=${encodeURIComponent(validNext)}`
      : "/auth/githubLoginStart";
    apiClient.get<{ data: { authorize_url: string } }>(url).then((res) => {
      window.location.href = res.data.data.authorize_url;
    });
  };

  const handleAuthNavigate = () => {
    // Already on auth page, no-op
  };

  return (
    <div className="min-h-screen text-gray-900 bg-white dark:text-white dark:bg-[#050505] font-space selection:bg-red-500 selection:text-white transition-colors duration-300 relative flex flex-col">
      <SEO
        title="Authentication"
        description="Sign in to DevsDistro with GitHub to buy or sell repositories."
        path="/authentication"
        robots="noindex, nofollow"
      />
      <Header
        handleAuthNavigate={handleAuthNavigate}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      <MobileMenu
        handleAuthNavigate={handleAuthNavigate}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      <main className="flex-grow pt-[calc(6rem+70px)] pb-24 px-4 mx-auto w-full max-w-5xl flex items-center justify-center">
        <div className="w-full border-2 border-black dark:border-white p-8 md:p-16 relative flex flex-col lg:flex-row gap-16 items-stretch">
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-8 justify-center md:justify-start">
              <div className="w-12 h-[2px] bg-red-500"></div>
              <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
                Auth Protocol
              </span>
              <div className="w-12 h-[2px] bg-red-500"></div>
            </div>

            <h1 className="font-syne font-black uppercase tracking-widest leading-none text-5xl md:text-6xl lg:text-7xl mb-6 break-words hyphens-auto">
              Initiate
              <br />
              Session
            </h1>

            <p className="text-gray-600 dark:text-gray-400 text-lg md:text-xl leading-relaxed mb-10">
              Authenticate using{" "}
              <span className="text-black dark:text-white font-bold">
                GITHUB OAUTH
              </span>
              .
            </p>

            <ul className="flex flex-col gap-5">
              <li className="flex gap-4 items-start">
                <span className="text-red-500 font-bold opacity-50">/</span>
                <span className="text-gray-600 dark:text-gray-400 font-space text-sm md:text-base">
                  Seamless repository integration.
                </span>
              </li>
              <li className="flex gap-4 items-start">
                <span className="text-red-500 font-bold opacity-50">/</span>
                <span className="text-gray-600 dark:text-gray-400 font-space text-sm md:text-base">
                  Instant delivery after every purchase.
                </span>
              </li>
              <li className="flex gap-4 items-start">
                <span className="text-red-500 font-bold opacity-50">/</span>
                <span className="text-gray-600 dark:text-gray-400 font-space text-sm md:text-base">
                  99% payment retention per transacted asset.
                </span>
              </li>
            </ul>
          </div>

          <div className="flex-1 w-full lg:w-3/5 border-t-2 lg:border-t-0 lg:border-l-2 border-black/10 dark:border-white/10 pt-12 lg:pt-0 lg:pl-16 flex flex-col items-center justify-center">
            <Code2
              size={64}
              className="text-black dark:text-white mb-10 opacity-30"
              strokeWidth={1}
            />

            <button
              className="w-full px-8 py-5 bg-black text-white dark:bg-white dark:text-black font-space font-bold uppercase tracking-widest text-xs md:text-sm transition-colors duration-200 border-2 border-transparent hover:bg-red-500 dark:hover:bg-red-500 hover:text-white dark:hover:text-white hover:border-black dark:hover:border-white flex items-center justify-center gap-4"
              onClick={handleLoginClick}
            >
              <span className="flex items-center justify-center gap-3">
                <GithubIcon className="w-6 h-6" />
                <span>Execute Auth</span>
                <ArrowRight className="w-5 h-5" />
              </span>
            </button>

            <div className="mt-12 text-center w-full">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.2em] mb-4">
                Legal Directives
              </p>
              <div className="flex flex-col gap-3 items-center">
                <Link
                  to="/terms"
                  className="group flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors uppercase tracking-widest"
                >
                  <span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    /
                  </span>
                  <span>Terms of Service</span>
                  <span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    /
                  </span>
                </Link>
                <Link
                  to="/privacy"
                  className="group flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors uppercase tracking-widest"
                >
                  <span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    /
                  </span>
                  <span>Privacy Policy</span>
                  <span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    /
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
