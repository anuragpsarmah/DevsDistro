import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundDots from "@/components/ui/backgroundDots";
import Sidebar from "./sub-components/Sidebar";
import AccountSettingsTab from "./tabs/AccountSettingsTab";
import DashboardOverviewTab from "./tabs/DashboardOverviewTab";
import ListNewProjectTab from "./tabs/ListNewProjectTab";
import ManageProjectsTab from "./tabs/ManageProjects";
import BillingAndPaymentsTab from "./tabs/BillingAndPayments";

interface SellerDashboardPageProps {
  logout?: () => Promise<void>;
}

export default function SellerDashboardPage({
  logout,
}: SellerDashboardPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard Overview");
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-900 text-white relative overflow-hidden">
      <BackgroundDots />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logout={logout}
        onSwitchToBuyer={() => navigate("/buyer-dashboard")}
      />

      <main className="flex-1 p-8 overflow-auto relative z-10">
        {activeTab === "Dashboard Overview" && (
          <DashboardOverviewTab logout={logout} />
        )}
        {activeTab === "Account Settings" && (
          <AccountSettingsTab logout={logout} />
        )}
        {activeTab === "List New Project" && (
          <ListNewProjectTab logout={logout} setActiveTab={setActiveTab} />
        )}
        {activeTab === "Manage Projects" && (
          <ManageProjectsTab logout={logout} />
        )}
        {activeTab === "Order History" && <></>}
        {activeTab === "Wallet Connection" && (
          <BillingAndPaymentsTab logout={logout} />
        )}
      </main>
    </div>
  );
}
