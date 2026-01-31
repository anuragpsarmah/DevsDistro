import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Store, Code2 } from "lucide-react";
import BackgroundDots from "@/components/ui/backgroundDots";
import { useNavigate } from "react-router-dom";
import { ProfileCard } from "./main-components/ProfileCard";

export default function ProfileSelectionPage() {
  const [hoveredProfile, setHoveredProfile] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-[#030712] flex items-center justify-center">
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

      <div className="absolute top-1/4 left-1/4 w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-4xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
          >
            <Code2 size={12} className="text-purple-400" />
            <span className="text-xs font-medium text-purple-300">Welcome to DevExchange</span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            <span className="text-white">Choose Your</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              Profile
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-lg mx-auto leading-relaxed">
            Select how you want to use DevExchange today. You can switch between profiles anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileCard
            title="Buyer"
            description="Browse and purchase innovative projects from developers worldwide"
            icon={<ShoppingBag className="w-7 h-7" />}
            features={["Discover battle-tested code", "Instant access on purchase", "Secure transactions"]}
            onClick={() => navigate("/buyer-marketplace")}
            isHovered={hoveredProfile === "buyer"}
            setHovered={() => setHoveredProfile("buyer")}
            setNotHovered={() => setHoveredProfile(null)}
            gradient="from-blue-500 to-cyan-500"
            delay={0.1}
          />
          <ProfileCard
            title="Seller"
            description="List your GitHub repositories and start earning from your code"
            icon={<Store className="w-7 h-7" />}
            features={["Keep 99% of earnings", "Easy repo integration", "Solana payments"]}
            onClick={() => navigate("/seller-dashboard")}
            isHovered={hoveredProfile === "seller"}
            setHovered={() => setHoveredProfile("seller")}
            setNotHovered={() => setHoveredProfile(null)}
            gradient="from-purple-500 to-pink-500"
            delay={0.2}
          />
        </div>
      </main>
    </div>
  );
}

