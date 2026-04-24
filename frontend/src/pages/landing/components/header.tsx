import { Link, useLocation } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import LogoIcon from "@/assets/icons/LogoIcon";
import { HeaderProps } from "../utils/types";
import { useTheme } from "@/components/providers/ThemeProvider";
import { landingPrimaryButtonChrome } from "./landingButtonStyles";

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
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl bg-white/90 dark:bg-[#050505]/90 backdrop-blur-md border border-neutral-300/70 dark:border-neutral-700/70 shadow-[0_12px_24px_-22px_rgba(38,38,38,0.38)] dark:shadow-[0_12px_26px_-24px_rgba(38,38,38,0.72)] transition-colors duration-300 rounded-xl md:rounded-2xl">
      <nav className="flex justify-between items-center px-4 md:px-6 py-2 md:py-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-syne font-black tracking-widest text-neutral-800 dark:text-white uppercase transition-colors group"
          aria-label="Go to DevsDistro home page"
        >
          <LogoIcon className="w-6 h-6" />
          <span className="group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors">
            DevsDistro
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-5 lg:gap-8 font-space text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {["The Revelation", "The Mechanics", "Validations", "Query Log"].map(
            (item) => {
              const id = item.toLowerCase().replace(" ", "-");
              return (
                <Link
                  key={item}
                  to={isHome ? `#${id}` : `/#${id}`}
                  onClick={() => handleScroll(id)}
                  className="hover:text-neutral-800 dark:hover:text-white transition-colors duration-500 ease-premium relative group text-[10px] md:text-[11px] lg:text-xs focus-visible:outline-none focus-visible:text-neutral-800 dark:focus-visible:text-white"
                >
                  <span>{item}</span>
                  <span className="absolute -bottom-2 left-0 h-[2px] w-full origin-center scale-x-0 rounded-full bg-red-500 opacity-0 transition-[transform,opacity] duration-500 ease-premium group-hover:scale-x-100 group-hover:opacity-100 group-focus-visible:scale-x-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
                </Link>
              );
            }
          )}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className={`${landingPrimaryButtonChrome} px-5 py-2.5 text-xs`}
            onClick={handleAuthNavigate}
          >
            Access Now
          </button>
        </div>

        <div className="md:hidden flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button
            className="text-neutral-800 dark:text-white hover:text-red-500 transition-colors"
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
    </header>
  );
}
