import { cn } from "@/lib/utils";
import { ChevronRight, Repeat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { SidebarContentProps, SidebarProps } from "../utils/types";
import { sidebarItems } from "../utils/constants";

export default function Sidebar({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  logout,
  onSwitchToBuyer,
}: SidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 2xl:w-72 h-screen sticky top-0 bg-gray-900/60 backdrop-blur-xl border-r border-white/10 relative z-10">
        <SidebarContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          logout={logout}
          onSwitchToBuyer={onSwitchToBuyer}
        />
      </aside>
      <div className="lg:hidden">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-20 p-2 bg-gray-900/80 backdrop-blur-xl rounded-md shadow-md border border-white/10"
          aria-label="Open sidebar"
        >
          <Menu className="h-6 w-6 text-white" />
        </button>

        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-30"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3 }}
                className="fixed top-0 left-0 bottom-0 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 z-40"
              >
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="absolute top-4 right-4 p-2 text-white"
                  aria-label="Close sidebar"
                >
                  <X className="h-6 w-6" />
                </button>
                <SidebarContent
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  logout={logout}
                  isSidebarOpen={isSidebarOpen}
                  setIsSidebarOpen={setIsSidebarOpen}
                  onSwitchToBuyer={onSwitchToBuyer}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function SidebarContent({
  activeTab,
  setActiveTab,
  logout,
  isSidebarOpen,
  setIsSidebarOpen,
  onSwitchToBuyer,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
          DevExchange
        </h2>
        <p className="text-sm text-gray-400 mt-1">Seller Dashboard</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1 2xl:space-y-2 px-3 2xl:px-4">
          {sidebarItems.map((item, index) => (
            <SidebarItem
              key={index}
              {...item}
              isActive={activeTab === item.label}
              onClick={() => {
                setActiveTab(item.label);
                if (isSidebarOpen && setIsSidebarOpen) setIsSidebarOpen(false);
              }}
            />
          ))}
        </ul>
      </nav>
      <div className="p-4 space-y-3 border-t border-white/10">
        <button
          className="w-full py-2 px-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 text-blue-100 border border-blue-500/20 hover:border-blue-500/40 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          onClick={onSwitchToBuyer}
        >
          <Repeat className="h-4 w-4 flex-shrink-0" />
          <span className="whitespace-nowrap">Switch to Buyer</span>
        </button>
        <button
          className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-md transition-all duration-300 transform hover:shadow-lg"
          onClick={logout}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 2xl:py-3 text-sm transition-colors duration-150",
          isActive
            ? "bg-white/10 text-white"
            : "text-gray-400 hover:text-white hover:bg-white/5",
          "focus:outline-none"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronRight className={cn(
          "h-4 w-4 ml-auto flex-shrink-0 transition-transform",
          isActive && "text-purple-400"
        )} />
      </button>
    </li>
  );
}
