import { useEffect, useState } from "react";
import { GithubIcon, ArrowRight } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuthValidationQuery } from "@/hooks/apiQueries";
import { apiClient } from "@/lib/axiosInstance";
import { isSafeRelativePath } from "@/utils/navigation";
import Header from "@/pages/landing/components/header";
import MobileMenu from "@/pages/landing/components/mobileMenu";
import Footer from "@/pages/landing/components/footer";
import SEO from "@/components/seo/SEO";
import { landingClimaxJoinButtonClassName } from "@/pages/landing/components/landingButtonStyles";
import noiseUrl from "@/assets/noise.svg?url";

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
    <div className="min-h-screen text-gray-900 bg-white dark:text-white dark:bg-[#050505] font-space selection:bg-red-500 selection:text-white transition-colors duration-300 relative flex flex-col overflow-hidden">
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

      <div className="landing-dotted-rule landing-dotted-x fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none z-30"></div>

      <main className="relative z-10 flex-grow pt-[calc(6rem+70px)] pb-24 px-4 w-full flex items-center justify-center">
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url(${noiseUrl})` }}
        ></div>
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-neutral-100/70 via-white/40 to-transparent dark:from-neutral-900/40 dark:via-[#050505]/30 pointer-events-none"></div>
        <div className="landing-dotted-rule landing-dotted-b absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none z-20"></div>

        <div className="mx-auto w-full max-w-3xl relative border-t-2 border-l-2 border-neutral-800/20 bg-white/95 backdrop-blur-sm transition-colors dark:border-white/20 dark:bg-[#080808]/95">
          <div className="relative flex flex-col items-stretch gap-0 border-b-2 border-r-2 border-neutral-800/20 transition-colors dark:border-white/20">
            <div className="flex items-center justify-between border-b-2 border-neutral-800/10 px-6 py-5 transition-colors dark:border-white/10 md:px-10">
              <span className="font-space text-xs font-bold uppercase tracking-[0.2em] text-neutral-800 dark:text-white">
                Authentication
              </span>
              <span className="font-space text-xs font-bold uppercase tracking-widest text-red-500">
                OAuth
              </span>
            </div>

            <div className="flex flex-col justify-center px-8 pb-8 pt-10 text-center md:px-12 md:pb-10 md:pt-12 lg:px-14 lg:pb-12 lg:pt-14">
              <h1 className="mb-6 font-syne text-5xl font-black uppercase leading-none tracking-widest text-neutral-900 break-words hyphens-auto dark:text-white md:text-6xl lg:text-7xl">
                Initiate
                <br />
                Session
              </h1>

              <p className="mx-auto max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-400 md:text-xl">
                Authenticate using{" "}
                <span className="font-bold text-red-500">GITHUB OAUTH</span>.
              </p>
            </div>

            <div className="flex w-full flex-col items-center justify-center px-8 pb-8 pt-8 md:px-10 md:pb-10 md:pt-10 lg:px-12 lg:pb-12 lg:pt-12">
              <button
                className={`group w-full max-w-md justify-center ${landingClimaxJoinButtonClassName}`}
                onClick={handleLoginClick}
              >
                <span className="flex items-center justify-center gap-3">
                  <GithubIcon className="w-6 h-6" />
                  <span>Execute Auth</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                </span>
              </button>

              <div className="mt-6 w-full max-w-md text-center md:mt-8 lg:mt-10">
                <div className="flex flex-col items-center gap-3">
                  <Link
                    to="/terms"
                    className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400"
                  >
                    <span>Terms of Service</span>
                  </Link>
                  <Link
                    to="/privacy"
                    className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400"
                  >
                    <span>Privacy Policy</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
