import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Repeat, Menu, X, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarContentProps, SidebarProps } from "../utils/types";
import { useTheme } from "@/components/providers/ThemeProvider";
import { sidebarItems } from "../utils/constants";
import LogoIcon from "@/assets/icons/LogoIcon";

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
      <aside className="hidden lg:flex flex-col w-80 h-screen sticky top-0 bg-white dark:bg-[#050505] border-r border-black/20 dark:border-white/20 relative z-10 transition-colors duration-300">
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
          className="fixed top-4 left-4 z-20 p-2 bg-white dark:bg-[#050505] border-2 border-black dark:border-white transition-colors duration-300"
          aria-label="Open sidebar"
        >
          <Menu className="h-6 w-6 text-black dark:text-white" />
        </button>

        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/80 z-30"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3 }}
                className="fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-[#050505] border-r border-black/10 dark:border-white/10 z-40 transition-colors duration-300"
              >
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="absolute top-4 right-4 p-2 text-black dark:text-white"
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
  const { isDarkMode, toggleTheme } = useTheme();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#050505] transition-colors duration-300">
      <div className="p-6 2xl:p-8">
        <div className="flex items-center gap-3 mb-6">
          <LogoIcon className="w-7 h-7 2xl:w-8 2xl:h-8 text-black dark:text-white flex-shrink-0" />
          <h2 className="font-syne text-xl 2xl:text-2xl font-black uppercase tracking-widest leading-none text-black dark:text-white whitespace-nowrap">
            DevsDistro
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-[2px] bg-red-500"></div>
          <span className="font-space font-bold uppercase tracking-[0.2em] text-[10px] text-red-500">Seller Dashboard</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-6 py-4" onMouseLeave={() => setHoveredTab(null)}>
        <ul className="space-y-4">
          {sidebarItems.map((item, index) => (
            <SidebarItem
              key={index}
              {...item}
              isActive={activeTab === item.label}
              isHovered={hoveredTab === item.label}
              onMouseEnter={() => setHoveredTab(item.label)}
              onClick={() => {
                setActiveTab(item.label);
                if (isSidebarOpen && setIsSidebarOpen) setIsSidebarOpen(false);
              }}
            />
          ))}
        </ul>
      </nav>
      <div className="p-6 space-y-4 border-t border-black/10 dark:border-white/10">
        <button
          className="w-full px-6 py-4 flex items-center justify-between border-2 border-black/20 dark:border-white/20 text-black dark:text-white font-space font-bold uppercase tracking-widest text-[10px] md:text-sm transition-colors duration-300 hover:border-black dark:hover:border-white"
          onClick={toggleTheme}
        >
          <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          className="w-full px-6 py-4 flex items-center justify-center gap-3 bg-white text-black dark:bg-[#050505] dark:text-white border-2 border-black dark:border-white font-space font-bold uppercase tracking-widest text-[10px] md:text-sm transition-colors duration-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black group"
          onClick={onSwitchToBuyer}
        >
          <Repeat className="h-4 w-4 flex-shrink-0 transition-transform duration-300 group-hover:rotate-180" />
          <span className="whitespace-nowrap">Switch to Buyer</span>
        </button>
        <button
          className="w-full px-6 py-4 bg-red-500 text-white font-space font-bold uppercase tracking-widest text-[10px] md:text-sm transition-colors duration-300 hover:bg-black dark:hover:bg-white dark:hover:text-black border-2 border-transparent hover:border-black dark:hover:border-white"
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
  isHovered,
  onMouseEnter,
  onClick,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <li onMouseEnter={onMouseEnter}>
      <button
        onClick={onClick}
        className={cn(
          "group relative flex w-full items-center gap-4 px-4 py-3 transition-colors duration-300 focus:outline-none border-2 font-space font-bold uppercase tracking-widest text-xs",
          isActive
            ? "border-black dark:border-white bg-black text-white dark:bg-white dark:text-black"
            : "border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
        )}
      >
        {isHovered && (
          <motion.div
            layoutId="seller-sidebar-hover"
            className={cn("absolute inset-0 border-2 z-0", isActive ? "border-black/50 dark:border-white/50 bg-black/10 dark:bg-white/10" : "border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02]")}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-3 flex-1">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronRight
          className={cn(
            "relative z-10 h-4 w-4 ml-auto flex-shrink-0 transition-all duration-300",
            isActive ? "text-red-500 opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
          )}
        />
      </button>
    </li>
  );
}
