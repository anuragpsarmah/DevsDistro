import { motion } from "framer-motion";
import { ChevronRightIcon } from "lucide-react";

interface HeroSectionProps {
  handleAuthNavigate: () => void;
}

export default function HeroSection({ handleAuthNavigate }: HeroSectionProps) {
  return (
    <section className="pt-32 pb-20 px-4 mt-10">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Marketplace For
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Innovative GitHub Projects
              </span>
            </motion.h1>
            <motion.p
              className="text-lg sm:text-xl text-gray-300 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Discover, collaborate, and monetize your coding projects with a
              global community of developers.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <button
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
                onClick={handleAuthNavigate}
              >
                Explore Projects{" "}
                <ChevronRightIcon className="inline-block ml-2 h-5 w-5" />
              </button>
              <button
                className="bg-transparent hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg border-2 border-purple-500 hover:border-purple-400 flex items-center justify-center"
                onClick={handleAuthNavigate}
              >
                List Your Project
                <ChevronRightIcon className="ml-2 h-5 w-5 text-purple-400" />
              </button>
            </motion.div>
          </div>
          <motion.div
            className="hidden md:block"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <img
              src="/placeholder.svg?height=400&width=600"
              width={600}
              height={400}
              alt="DevExchange Platform"
              className="rounded-lg shadow-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
