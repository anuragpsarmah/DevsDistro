import { Link, useLocation } from "react-router-dom";
import { MenuIcon, XIcon } from "lucide-react";
import { motion } from "framer-motion";

interface HeaderProps {
  handleAuthNavigate: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}

export default function Header({
  handleAuthNavigate,
  isMenuOpen,
  setIsMenuOpen,
}: HeaderProps) {
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
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
    >
      <nav className="max-w-5xl mx-auto flex justify-between items-center px-5 py-2.5 rounded-full bg-white/[0.03] backdrop-blur-md border border-white/[0.08]">
        <Link to="/" className="text-lg font-semibold tracking-tight hover:opacity-80 transition-opacity">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">DevExchange</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "Projects", "Reviews", "FAQs"].map((item) => (
            <Link
              key={item}
              to={isHome ? `#${item.toLowerCase()}` : `/#${item.toLowerCase()}`}
              onClick={() => handleScroll(item.toLowerCase())}
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <button
            className="text-sm font-medium text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 px-5 py-2 rounded-full transition-opacity duration-200"
            onClick={handleAuthNavigate}
          >
            Get Started
          </button>
        </div>

        <button
          className="md:hidden text-gray-400 hover:text-white p-1.5 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>
      </nav>
    </motion.header>
  );
}
