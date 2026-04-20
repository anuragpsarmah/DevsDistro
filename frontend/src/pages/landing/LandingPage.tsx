import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "./components/header";
import MobileMenu from "./components/mobileMenu";
import TheIntroduction from "./components/theIntroduction";
import TheRevelation from "./components/theRevelation";
import TheMechanics from "./components/theMechanics";
import TheClimax from "./components/theClimax";
import FAQ from "./components/faq";
import Reviews from "./components/reviews";
import Footer from "./components/footer";
import { useAuthValidationQuery } from "@/hooks/apiQueries";
import SEO from "@/components/seo/SEO";
import { faqs } from "./utils/constants";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const landingStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/LogoIcon.svg`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [
      "https://github.com/anuragpsarmah/DevsDistro",
      "https://x.com/anuragpsarmah",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  },
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError } = useAuthValidationQuery();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.hash]);

  useEffect(() => {
    const handleAuthValidation = async () => {
      if (!isLoading && !isError && data?.data?._id) {
        navigate("/profile-selection");
      }
    };

    handleAuthValidation();
  }, [isError, isLoading, data, navigate]);

  const handleAuthNavigate = () => {
    navigate("/authentication");
  };

  useEffect(() => {
    const handleResize = () => setIsMenuOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen text-gray-900 bg-white dark:text-white relative dark:bg-[#050505] font-space selection:bg-red-500 selection:text-white transition-colors duration-300">
      <SEO
        title={SITE_NAME}
        description={DEFAULT_DESCRIPTION}
        path="/"
        structuredData={landingStructuredData}
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

      <main className="relative z-10 w-full pt-0">
        {/* Global vertical dashed lines bounding the max-width */}
        <div className="landing-dotted-rule landing-dotted-x fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none z-30"></div>

        <TheIntroduction handleAuthNavigate={handleAuthNavigate} />
        <TheRevelation />
        <TheMechanics />
        <Reviews />
        <FAQ />
        <TheClimax handleAuthNavigate={handleAuthNavigate} />
      </main>

      <Footer />
    </div>
  );
}
