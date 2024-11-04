import { MenuIcon, XIcon } from "lucide-react";

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
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900 bg-opacity-90 backdrop-blur-md">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
          DevExchange
        </div>
        <div className="hidden md:flex space-x-8">
          {["Features", "Showcase", "Reviews", "FAQs"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-gray-300 hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
        </div>
        <div className="hidden md:block">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition-colors"
            onClick={handleAuthNavigate}
          >
            Get Started
          </button>
        </div>
        <button
          className="md:hidden text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </nav>
    </header>
  );
}
