import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { landingPrimaryButtonChrome } from "./landingButtonStyles";

interface MobileMenuProps {
  handleAuthNavigate: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}

export default function MobileMenu({
  handleAuthNavigate,
  isMenuOpen,
  setIsMenuOpen,
}: MobileMenuProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const handleScroll = (id: string) => {
    setIsMenuOpen(false);
    if (isHome) {
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
    }
  };

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          id="mobile-navigation"
          className="fixed inset-0 z-40 bg-white dark:bg-[#050505] pt-24 px-6 md:hidden overflow-y-auto transition-colors duration-300"
        >
          <div className="flex flex-col gap-8 h-full">
            <div className="flex flex-col gap-6 font-syne text-3xl font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {[
                "The Revelation",
                "The Mechanics",
                "Validations",
                "Query Log",
              ].map((item) => {
                const id = item.toLowerCase().replace(" ", "-");
                return (
                  <Link
                    key={item}
                    to={isHome ? `#${id}` : `/#${id}`}
                    onClick={() => handleScroll(id)}
                    className="hover:text-neutral-800 dark:hover:text-white hover:translate-x-2 transition-all duration-300"
                  >
                    {item}
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 pt-8 border-t border-neutral-800/10 dark:border-white/20">
              <button
                className={`${landingPrimaryButtonChrome} w-full justify-center px-6 py-6 text-xl`}
                onClick={() => {
                  setIsMenuOpen(false);
                  handleAuthNavigate();
                }}
              >
                Access Now
              </button>
            </div>

            <div className="md:hidden mt-8 flex justify-center border-t border-neutral-800/10 dark:border-white/20 pt-8">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-white transition-colors border border-neutral-800/10 dark:border-white/20 rounded-full px-6 py-3"
                aria-label="Toggle theme"
              >
                {isDarkMode ? (
                  <>
                    <Sun size={20} />
                    <span className="font-space font-bold uppercase tracking-widest text-sm">
                      Light Mode
                    </span>
                  </>
                ) : (
                  <>
                    <Moon size={20} />
                    <span className="font-space font-bold uppercase tracking-widest text-sm">
                      Dark Mode
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-auto pb-12 opacity-10 dark:opacity-30 pointer-events-none overflow-hidden">
              <div
                aria-hidden="true"
                className="font-syne text-2xl font-black text-transparent text-center w-full"
                style={{
                  WebkitTextStroke: isDarkMode ? "1px white" : "1px black",
                }}
              >
                DEVS_DISTRO
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
