import { useState, useEffect } from "react";
import { ShoppingBag, Store } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ProfileCard } from "./main-components/ProfileCard";
import { isSafeRelativePath } from "@/utils/navigation";
import SEO from "@/components/seo/SEO";

export default function ProfileSelectionPage() {
  const [hoveredProfile, setHoveredProfile] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const nextParam = searchParams.get("next");
  const validNext = isSafeRelativePath(nextParam) ? nextParam : null;

  useEffect(() => {
    if (validNext) {
      navigate(validNext, { replace: true });
    }
  }, [validNext, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-gray-900 dark:text-white font-space selection:bg-red-500 selection:text-white transition-colors duration-300 relative">
      <SEO
        title="Profile Selection"
        description="Choose your DevsDistro operating profile."
        path="/profile-selection"
        robots="noindex, nofollow"
      />
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.10] dark:hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,1) 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 0%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 50%, black 0%, transparent 80%)",
        }}
      ></div>
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block z-0 opacity-[0.20]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 0%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 50%, black 0%, transparent 80%)",
        }}
      ></div>

      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 py-32 flex flex-col items-center">
        <div className="flex items-center justify-center mb-12 w-full text-center">
          <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
            - Profile Init -
          </span>
        </div>

        <div className="text-left md:text-center w-full max-w-4xl mb-24">
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black uppercase tracking-widest leading-none font-syne mb-8 break-words hyphens-auto">
            SELECT <br className="hidden md:block" />
            <span
              className="text-black dark:text-white"
              style={{ WebkitTextStroke: "1px rgba(128,128,128,0.2)" }}
            >
              YOUR
            </span>{" "}
            PROFILE
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed font-space max-w-2xl md:mx-auto border-l-2 md:border-l-0 md:border-t-2 border-black/10 dark:border-white/10 pl-6 md:pl-0 pt-0 md:pt-8 md:text-center">
            SPECIFY HOW YOU WANT TO OPERATE. YOU CAN SWITCH BETWEEN PROFILES
            ANYTIME DURING YOUR SESSION.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 w-full">
          <ProfileCard
            title="Buyer"
            description="BROWSE AND ACQUIRE BATTLE-TESTED REPOSITORIES FROM TOP DEVELOPERS."
            icon={<ShoppingBag className="w-8 h-8" strokeWidth={1.5} />}
            features={[
              "SECURE TRANSACTIONS",
              "INSTANT ACCESS ON PURCHASE",
              "VERIFIED REPOSITORIES",
            ]}
            onClick={() =>
              validNext ? navigate(validNext) : navigate("/buyer-marketplace")
            }
            isHovered={hoveredProfile === "buyer"}
            setHovered={() => setHoveredProfile("buyer")}
            setNotHovered={() => setHoveredProfile(null)}
          />
          <ProfileCard
            title="Seller"
            description="MONETIZE YOUR EXISTING GITHUB REPOSITORIES. KEEP 99% OF YOUR EARNINGS."
            icon={<Store className="w-8 h-8" strokeWidth={1.5} />}
            features={[
              "EASY REPO INTEGRATION",
              "SOLANA PAYMENTS",
              "GLOBAL DISTRIBUTION",
            ]}
            onClick={() => navigate("/seller-dashboard")}
            isHovered={hoveredProfile === "seller"}
            setHovered={() => setHoveredProfile("seller")}
            setNotHovered={() => setHoveredProfile(null)}
          />
        </div>
      </main>
    </div>
  );
}
