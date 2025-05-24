import { useState, useEffect } from "react";
import BackgroundDots from "@/components/ui/backgroundDotsLanding";
import { useNavigate } from "react-router-dom";
import Header from "./components/header";
import MobileMenu from "./components/mobileMenu";
import HeroSection from "./components/heroSection";
import FeatureSection from "./components/featureSection";
import ShowcaseSection from "./components/showcaseSection";
import ReviewSection from "./components/reviewSection";
import FAQSection from "./components/faqSection";
import CallForAction from "./components/callForAction";
import Footer from "./components/footer";
import { useAuthValidationQuery } from "@/hooks/apiQueries";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAuthValidationQuery();

  useEffect(() => {
    const handleAuthValidation = async () => {
      if (!isLoading && !isError && data) {
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
    <div
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        background:
          "radial-gradient(100% 25% at bottom, #35518d 4%, #111827 100%, #111827 100%)",
      }}
    >
      <BackgroundDots />

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

      <main className="relative z-10">
        <HeroSection handleAuthNavigate={handleAuthNavigate} />
        <FeatureSection />
        <ShowcaseSection />
        <ReviewSection />
        <FAQSection />
        <CallForAction handleAuthNavigate={handleAuthNavigate} />
      </main>

      <Footer />
    </div>
  );
}
