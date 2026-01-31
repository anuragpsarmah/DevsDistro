import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundDots from "@/components/ui/backgroundDots";
import Sidebar from "./main-components/Sidebar";
import { BuyerDashboardTabTypes } from "./utils/types";
import MarketplaceTab from "./tabs/MarketplaceTab";

interface BuyerDashboardPageProps {
  logout?: () => Promise<void>;
}

export default function BuyerDashboardPage({
  logout,
}: BuyerDashboardPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] =
    useState<BuyerDashboardTabTypes>("Marketplace");
  const navigate = useNavigate();

  return (
    <div className="h-screen flex text-white relative overflow-hidden bg-[#030712]">
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

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logout={logout}
        onSwitchToSeller={() => navigate("/seller-dashboard")}
      />

      <main className="flex-1 p-8 overflow-auto relative z-10">
        {activeTab === "Marketplace" && <MarketplaceTab logout={logout} />}
      </main>
    </div>
  );
}
