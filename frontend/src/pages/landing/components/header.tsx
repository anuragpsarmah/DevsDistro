import { Link, useLocation } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import LogoIcon from "@/assets/icons/LogoIcon";
import { HeaderProps } from "../utils/types";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function Header({
  handleAuthNavigate,
  isMenuOpen,
  setIsMenuOpen,
}: HeaderProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const handleScroll = (id: string) => {
    if (isHome) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md border-b-2 border-black/10 dark:border-white/10 transition-colors duration-300"
    >
      <nav className="w-full flex justify-between items-center px-6 py-4">
        <Link
          to="/"
          className="flex items-center gap-3 text-xl font-syne font-black tracking-widest text-black dark:text-white uppercase transition-colors group"
          aria-label="Go to DevsDistro home page"
        >
          <LogoIcon className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
          <span className="group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors">
            DevsDistro
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 lg:gap-12 font-space text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {["The Revelation", "The Mechanics", "Validations", "Query Log"].map(
            (item) => {
              const id = item.toLowerCase().replace(" ", "-");
              return (
                <Link
                  key={item}
                  to={isHome ? `#${id}` : `/#${id}`}
                  onClick={() => handleScroll(id)}
                  className="hover:text-black dark:hover:text-white transition-colors duration-200 relative group text-xs md:text-sm"
                >
                  <span>{item}</span>
                  <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-red-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100"></span>
                </Link>
              );
            }
          )}
        </div>

        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            className="text-sm font-space font-bold uppercase tracking-widest text-white dark:text-black bg-black dark:bg-white hover:bg-red-500 dark:hover:bg-red-500 hover:text-white px-6 py-3 transition-colors duration-200 border-2 border-transparent hover:border-black dark:hover:border-white"
            onClick={handleAuthNavigate}
          >
            Access Now
          </button>
        </div>

        <div className="md:hidden flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button
            className="text-black dark:text-white hover:text-red-500 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>
    </motion.header>
  );
}
