import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BrutalistBackground from "@/components/ui/brutalistBackground";
import Sidebar from "./main-components/Sidebar";
import { BuyerDashboardTabTypes } from "./utils/types";
import MarketplaceTab from "./tabs/MarketplaceTab";
import WishlistTab from "./tabs/WishlistTab";
import OrdersTab from "./tabs/OrdersTab";
import PurchaseLedgerTab from "./tabs/PurchaseLedgerTab";
import { isMongoObjectId } from "@/utils/navigation";
import SEO from "@/components/seo/SEO";

interface BuyerDashboardPageProps {
  logout?: () => Promise<void>;
}

export default function BuyerDashboardPage({
  logout,
}: BuyerDashboardPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] =
    useState<BuyerDashboardTabTypes>("Marketplace");
  const [initialProjectId, setInitialProjectId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const lastProcessedOpenProjectRef = useRef<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const openProject = searchParams.get("openProject");
    if (
      openProject &&
      isMongoObjectId(openProject) &&
      openProject !== lastProcessedOpenProjectRef.current
    ) {
      setActiveTab("Marketplace");
      setInitialProjectId(openProject);
      lastProcessedOpenProjectRef.current = openProject;
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("openProject");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="h-screen flex transition-colors duration-300 relative overflow-hidden bg-white text-neutral-800 dark:text-white dark:bg-[#050505]">
      <SEO
        title="Buyer Marketplace"
        description="Browse DevsDistro marketplace listings, orders, and purchase history."
        path="/buyer-marketplace"
        robots="noindex, nofollow"
      />
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
        {activeTab === "Marketplace" && (
          <MarketplaceTab logout={logout} initialProjectId={initialProjectId} />
        )}
        {activeTab === "Wishlist" && <WishlistTab logout={logout} />}
        {activeTab === "Purchases" && <OrdersTab logout={logout} />}
        {activeTab === "Purchase Ledger" && (
          <PurchaseLedgerTab logout={logout} />
        )}
      </main>
    </div>
  );
}
