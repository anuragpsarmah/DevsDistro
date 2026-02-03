import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundDots from "@/components/ui/backgroundDots";
import { GithubIcon, Code2, ArrowRight, ShieldAlert, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthValidationQuery } from "@/hooks/apiQueries";
import Header from "@/pages/landing/components/header";
import MobileMenu from "@/pages/landing/components/mobileMenu";
import Footer from "@/pages/landing/components/footer";

export default function AuthPage() {
  const clientID = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAuthValidationQuery();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

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

  useEffect(() => {
    const handleResize = () => setIsMenuOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLoginClick = () => {
    setShowWarningModal(true);
  };

  const handleProceedWithLogin = () => {
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientID}&scope=read:user,repo`;
  };

  const handleAuthNavigate = () => {
    // Already on auth page, no-op
  };

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

      <main className="relative z-10 min-h-screen flex items-center justify-center pt-20 pb-12 px-4">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Welcome to
              </span>
              <br />
              <span className="text-white">DevExchange</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-400 max-w-md mx-auto leading-relaxed">
              Connect your GitHub account to start buying and selling source code from developers worldwide.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl rounded-2xl" />
            
            <div className="relative bg-gray-900/60 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-600/5 rounded-2xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Code2 size={20} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Get Started</h2>
                </div>

                <p className="text-gray-400 text-center mb-8 text-sm">
                  Join fellow developers monetizing their code or discovering battle-tested solutions.
                </p>

                <button
                  className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02]"
                  onClick={handleLoginClick}
                >
                  <GithubIcon className="w-5 h-5" />
                  <span>Continue with GitHub</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="mt-6 pt-6 border-t border-white/5 text-center">
                  <p className="text-xs text-gray-500">
                    By continuing, you agree to our{" "}
                    <Link to="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">
                      Terms of Service
                    </Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 grid grid-cols-3 gap-4 text-center"
          >
            <div>
              <div className="text-white font-semibold mb-1">99%</div>
              <div className="text-xs text-gray-500">Earnings Kept</div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Solana</div>
              <div className="text-xs text-gray-500">Fast Payments</div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">GitHub</div>
              <div className="text-xs text-gray-500">Integration</div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />

      <AnimatePresence>
        {showWarningModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWarningModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />
              
              <div className="relative p-6">
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <ShieldAlert size={20} className="text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Security Recommendation</h3>
                </div>

                <div className="space-y-4 text-sm text-gray-300 mb-6">
                  <p>
                    DevExchange requires a GitHub Access Token to verify your identity and list your repositories. While we encrypt all tokens using <strong className="text-white">AES-256 encryption</strong> and transmit data over <strong className="text-white">secure SSL/TLS connections</strong>, we recommend taking an extra precaution:
                  </p>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-amber-200">
                      <strong>Create a dedicated GitHub account</strong> for DevExchange. Avoid connecting accounts that have access to sensitive private repositories not intended for sale.
                    </p>
                  </div>
                </div>

                <button
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                  onClick={handleProceedWithLogin}
                >
                  <GithubIcon className="w-4 h-4" />
                  <span>I Understand, Continue</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
