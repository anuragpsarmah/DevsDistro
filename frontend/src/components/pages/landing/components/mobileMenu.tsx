import { AnimatePresence, motion } from "framer-motion";

interface MobileMenuProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}

export default function MobileMenu({
  isMenuOpen,
  setIsMenuOpen,
}: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-95 md:hidden"
        >
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            {["Features", "Showcase", "Reviews"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-2xl text-gray-300 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-colors text-xl"
              onClick={() => setIsMenuOpen(false)}
            >
              Get Started
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
