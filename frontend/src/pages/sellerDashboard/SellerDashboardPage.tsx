import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundDots from "@/components/ui/backgroundDots";
import Sidebar from "./main-components/Sidebar";
import AccountSettingsTab from "./tabs/AccountSettingsTab";
import DashboardOverviewTab from "./tabs/DashboardOverviewTab";
import ListNewProjectTab from "./tabs/ListNewProjectTab";
import ManageProjectsTab from "./tabs/ManageProjectsTab";
import BillingAndPaymentsTab from "./tabs/BillingAndPayments";
import { SellerDashboardTabTypes } from "./utils/types";

interface SellerDashboardPageProps {
  logout?: () => Promise<void>;
}

export default function SellerDashboardPage({
  logout,
}: SellerDashboardPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] =
    useState<SellerDashboardTabTypes>("Overview");
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
        onSwitchToBuyer={() => navigate("/buyer-marketplace")}
      />

      <main className="flex-1 p-4 lg:p-6 lg:pb-8 overflow-y-auto lg:overflow-hidden relative z-10 max-h-screen">
        {activeTab === "Overview" && (
          <DashboardOverviewTab logout={logout} />
        )}
        {activeTab === "Settings" && (
          <AccountSettingsTab logout={logout} />
        )}
        {activeTab === "List Project" && (
          <ListNewProjectTab logout={logout} setActiveTab={setActiveTab} />
        )}
        {activeTab === "My Projects" && (
          <ManageProjectsTab logout={logout} />
        )}
        {activeTab === "Orders" && <></>}
        {activeTab === "Wallet" && (
          <BillingAndPaymentsTab logout={logout} />
        )}
      </main>
    </div>
  );
}
