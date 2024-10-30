import { useState } from "react";
import BackgroundDots from "@/components/ui/backgroundDots";
import Sidebar from "./components/sidebar";
import GeneralStatistics from "./components/generalStatistics";

export default function SellerDashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("General Statistics");

  return (
    <div className="flex h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white relative overflow-hidden">
      <BackgroundDots />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 p-8 overflow-auto relative z-10">
        {activeTab === "General Statistics" && <GeneralStatistics />}
        {activeTab === "Profile" && <></>}
        {activeTab === "Project Listings" && <></>}
        {activeTab === "Orders" && <></>}
        {activeTab === "Payments" && <></>}
      </main>
    </div>
  );
}
