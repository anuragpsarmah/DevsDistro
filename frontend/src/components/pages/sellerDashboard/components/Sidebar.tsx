import { cn } from "@/lib/utils";
import {
  BarChart2,
  User,
  PlusSquare,
  ShoppingCart,
  CreditCard,
  ChevronRight,
  Repeat,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

interface SidebarContentProps {
  activeTab: string;
  setActiveTab: (tabName: string) => void;
  logout?: () => Promise<void>;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (openStatus: boolean) => void;
  onSwitchToBuyer?: () => void;
}

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tabName: string) => void;
  logout?: () => Promise<void>;
  onSwitchToBuyer?: () => void;
}

const sidebarItems = [
  { icon: BarChart2, label: "Dashboard Overview" },
  { icon: User, label: "Account Settings" },
  { icon: PlusSquare, label: "Manage Projects" },
  { icon: ShoppingCart, label: "Order History" },
  { icon: CreditCard, label: "Billing & Payments" },
];

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
      <aside className="hidden lg:flex flex-col w-64 bg-gray-800 border-r border-gray-700 relative z-10">
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
          className="fixed top-4 left-4 z-20 p-2 bg-gray-800 rounded-md shadow-md"
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
                className="fixed top-0 left-0 bottom-0 w-64 bg-gray-800 z-40"
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
      <nav className="flex-1">
        <ul className="space-y-3 px-3">
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
      <div className="p-4 space-y-3 border-t border-gray-700">
        <button
          className="w-full py-2 px-4 text-gray-300 hover:text-white font-medium rounded-md transition-all duration-300 ease-in-out bg-gray-700 flex items-center justify-center gap-2 hover:bg-gray-600"
          onClick={onSwitchToBuyer}
        >
          <Repeat className="h-5 w-5" />
          Switch to Buyer Space
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
          "flex w-full items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-200",
          isActive
            ? "bg-gray-700 text-white"
            : "text-gray-300 hover:bg-gray-700 hover:text-white",
          "focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
        <ChevronRight className="h-4 w-4 ml-auto" />
      </button>
    </li>
  );
}
