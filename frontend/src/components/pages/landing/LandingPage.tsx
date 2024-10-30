import { useState, useEffect } from "react";
import BackgroundDots from "@/components/ui/backgroundDots";
import { useNavigate } from "react-router-dom";
import Header from "./components/header";
import MobileMenu from "./components/mobileMenu";
import HeroSection from "./components/heroSection";
import FeatureSection from "./components/featureSection";
import ShowcaseSection from "./components/showcaseSection";
import ReviewSection from "./components/reviewSection";
import CallForAction from "./components/callForAction";
import Footer from "./components/footer";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

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

      <MobileMenu isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      <main className="relative z-10">
        <HeroSection handleAuthNavigate={handleAuthNavigate} />
        <FeatureSection />
        <ShowcaseSection />
        <ReviewSection />
        <CallForAction />
      </main>

      <Footer />
    </div>
  );
}
