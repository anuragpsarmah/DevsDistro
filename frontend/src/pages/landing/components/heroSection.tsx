"use client";

import { motion } from "framer-motion";
import { ChevronRightIcon } from "lucide-react";
import HeroImage from "@/assets/HeroImage.png";

interface HeroSectionProps {
  handleAuthNavigate: () => void;
}

export default function HeroSection({ handleAuthNavigate }: HeroSectionProps) {
  return (
    <section className="pt-6 pb-10 px-4 relative overflow-hidden min-h-screen flex flex-col justify-center">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30" />
        <div className="absolute top-60 left-1/2 -translate-x-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10 mt-16">
        <motion.div
          className="mb-2 w-full max-w-3xl mx-auto flex justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <img src={HeroImage} alt="Hero Image" className="w-[320px] h-auto" />
        </motion.div>

        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Buy & Sell
              </span>
              <div className="mt-2 relative">
                <span className="text-white">Source Code</span>
                <span className="ml-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-400">
                  Securely
                </span>

                <div className="h-6 relative mt-1">
                  <motion.div
                    className="absolute left-0 right-0 h-2 bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40 rounded-full"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                  <motion.div
                    className="absolute left-[10%] right-[10%] top-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 1, delay: 0.7 }}
                  />
                </div>
              </div>
            </h1>
          </motion.div>

          <motion.p
            className="text-lg sm:text-xl text-gray-300 mt-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Connect your GitHub account, list your private repositories, and
            monetize your code. Or find and purchase proven solutions from other
            developers.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <button
              className="w-[200px] bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/25"
              onClick={handleAuthNavigate}
            >
              <span className="whitespace-nowrap">Buy Code</span>
              <ChevronRightIcon className="inline-block ml-2 h-4 w-4" />
            </button>

            <button
              className="w-[200px] bg-transparent hover:bg-gray-800/50 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg border-2 border-purple-500 hover:border-purple-400 flex items-center justify-center backdrop-blur-sm"
              onClick={handleAuthNavigate}
            >
              <span className="whitespace-nowrap">List Repository</span>
              <ChevronRightIcon className="ml-2 h-4 w-4 text-purple-400" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
