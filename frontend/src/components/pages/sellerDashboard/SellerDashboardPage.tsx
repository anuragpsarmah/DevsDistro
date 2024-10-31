import { useState } from "react";
import BackgroundDots from "@/components/ui/backgroundDots";
import Sidebar from "./components/sidebar";
import GeneralStatistics from "./components/dashboardOverview";

interface ProfileSelectionPageProps {
  logout: () => Promise<void>;
}

export default function SellerDashboardPage({
  logout,
}: ProfileSelectionPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard Overview");

  return (
    <div className="flex h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white relative overflow-hidden">
      <BackgroundDots />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logout={logout}
      />

      <main className="flex-1 p-8 overflow-auto relative z-10">
        {activeTab === "Dashboard Overview" && <GeneralStatistics />}
        {activeTab === "Account Settings" && <></>}
        {activeTab === "Manage Projects" && <></>}
        {activeTab === "Order History" && <></>}
        {activeTab === "Billing & Payments" && <></>}
      </main>
    </div>
  );
}
