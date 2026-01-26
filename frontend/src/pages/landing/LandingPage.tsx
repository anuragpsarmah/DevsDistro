import { useState, useEffect } from "react";
import BackgroundDots from "@/components/ui/backgroundDots";
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
    window.scrollTo(0, 0);
  }, []);

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
    <div className="min-h-screen text-white relative overflow-hidden bg-[#030712]">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 0%, rgba(88, 28, 135, 0.15) 0%, transparent 60%),
            radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.05) 0%, transparent 40%),
            #030712
          `,
        }}
      />
      
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
