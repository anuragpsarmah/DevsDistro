import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BrutalistBackground from "@/components/ui/brutalistBackground";
import Sidebar from "./main-components/Sidebar";
import AccountSettingsTab from "./tabs/AccountSettingsTab";
import DashboardOverviewTab from "./tabs/DashboardOverviewTab";
import ListNewProjectTab from "./tabs/ListNewProjectTab";
import ManageProjectsTab from "./tabs/ManageProjectsTab";
import BillingAndPaymentsTab from "./tabs/BillingAndPayments";
import SalesTab from "./tabs/SalesTab";
import { SellerDashboardTabTypes } from "./utils/types";

interface SellerDashboardPageProps {
  logout?: () => Promise<void>;
}

export default function SellerDashboardPage({
  logout,
}: SellerDashboardPageProps) {
  const location = useLocation();
  const initialTab =
    (location.state as { activeTab?: SellerDashboardTabTypes })?.activeTab ||
    "Overview";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] =
    useState<SellerDashboardTabTypes>(initialTab);
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
        onSwitchToBuyer={() => navigate("/buyer-marketplace")}
      />

      <main className="flex-1 p-4 lg:p-6 lg:pb-8 overflow-y-auto lg:overflow-hidden relative z-10 max-h-screen">
        {activeTab === "Overview" && <DashboardOverviewTab logout={logout} />}
        {activeTab === "Settings" && <AccountSettingsTab logout={logout} />}
        {activeTab === "List Project" && (
          <ListNewProjectTab logout={logout} setActiveTab={setActiveTab} />
        )}
        {activeTab === "My Projects" && (
          <ManageProjectsTab logout={logout} setActiveTab={setActiveTab} />
        )}
        {activeTab === "Sales" && <SalesTab logout={logout} />}
        {activeTab === "Wallet" && <BillingAndPaymentsTab logout={logout} />}
      </main>
    </div>
  );
}
