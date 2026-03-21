import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrutalistBackground from "@/components/ui/brutalistBackground";
import Sidebar from "./main-components/Sidebar";
import { BuyerDashboardTabTypes } from "./utils/types";
import MarketplaceTab from "./tabs/MarketplaceTab";
import WishlistTab from "./tabs/WishlistTab";
import OrdersTab from "./tabs/OrdersTab";
import PurchaseLedgerTab from "./tabs/PurchaseLedgerTab";

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
    <div className="h-screen flex transition-colors duration-300 relative overflow-hidden bg-white text-black dark:text-white dark:bg-[#050505]">
      <BrutalistBackground />
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
        {activeTab === "Wishlist" && <WishlistTab logout={logout} />}
        {activeTab === "Purchases" && <OrdersTab logout={logout} />}
        {activeTab === "Purchase Ledger" && (
          <PurchaseLedgerTab logout={logout} />
        )}
      </main>
    </div>
  );
}
