import { useState } from "react";
import { motion } from "framer-motion";
import { UserIcon, StoreIcon } from "lucide-react";
import BackgroundDots from "@/components/ui/backgroundDots";
import { useNavigate } from "react-router-dom";

export default function ProfileSelectionPage() {
  const [hoveredProfile, setHoveredProfile] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 relative overflow-hidden">
      <BackgroundDots />

      <div className="w-full max-w-4xl z-10">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-4 relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
              DevExchange
            </span>
          </h1>
          <p className="text-xl text-gray-300 font-light">
            Choose Your Profile
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ProfileCard
            title="Buyer"
            description="Browse and purchase innovative GitHub projects"
            icon={<UserIcon className="w-12 h-12 mb-4" />}
            onClick={() => {
              navigate("/buyer-dashboard");
            }}
            isHovered={hoveredProfile === "buyer"}
            setHovered={() => setHoveredProfile("buyer")}
            setNotHovered={() => setHoveredProfile(null)}
          />
          <ProfileCard
            title="Seller"
            description="Showcase and sell your GitHub projects"
            icon={<StoreIcon className="w-12 h-12 mb-4" />}
            onClick={() => {
              navigate("/seller-dashboard");
            }}
            isHovered={hoveredProfile === "seller"}
            setHovered={() => setHoveredProfile("seller")}
            setNotHovered={() => setHoveredProfile(null)}
          />
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400">
            Not sure which profile to choose?{" "}
            <a href="#" className="text-blue-400 hover:underline">
              Learn more about buyer and seller roles
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

interface ProfileCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  isHovered: boolean;
  setHovered: () => void;
  setNotHovered: () => void;
}

function ProfileCard({
  title,
  description,
  icon,
  onClick,
  isHovered,
  setHovered,
  setNotHovered,
}: ProfileCardProps) {
  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-8 shadow-2xl relative overflow-hidden border border-gray-700 flex flex-col items-center justify-center text-center cursor-pointer"
      onClick={onClick}
      onMouseEnter={setHovered}
      onMouseLeave={setNotHovered}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 z-0"></div>
      <div className="relative z-10">
        <span className="flex flex-row justify-center">{icon}</span>
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        <p className="text-gray-300 mb-6">{description}</p>
        <motion.div
          className="w-full h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
