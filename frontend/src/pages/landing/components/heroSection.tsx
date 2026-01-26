"use client";

import { motion } from "framer-motion";
import { ChevronRightIcon, Shield, Zap, Github } from "lucide-react";
import HeroImage from "@/assets/HeroImage.png";

interface HeroSectionProps {
  handleAuthNavigate: () => void;
}

export default function HeroSection({ handleAuthNavigate }: HeroSectionProps) {
  return (
    <section className="min-h-screen flex flex-col justify-center relative overflow-hidden pt-20 pb-24 px-4">
      <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-blue-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-[500px] h-[400px] bg-pink-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <div className="text-center lg:text-left order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
            >
              <Github size={12} className="text-blue-400" />
              <span className="text-xs font-medium text-blue-300">Open Source Project</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">Buy & Sell</span>
              <br />
              <span className="text-white">Source Code</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Securely</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-gray-400 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed"
            >
              Connect your GitHub, list private repos, and start earning. 
              Or discover battle-tested solutions from developers worldwide.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10"
            >
              <button
                className="group flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-medium py-3 px-6 rounded-full transition-all duration-200"
                onClick={handleAuthNavigate}
              >
                <span>Start Selling</span>
                <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                className="group flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-6 rounded-full transition-all duration-200 border border-white/10"
                onClick={handleAuthNavigate}
              >
                <span>Browse Projects</span>
                <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-500"
            >
              <div className="flex items-center gap-1.5">
                <Shield size={14} className="text-green-500" />
                <span>Secure Payments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-yellow-500" />
                <span>Instant Access</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="order-1 lg:order-2 flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl scale-75 pointer-events-none" />
              
              <div className="absolute right-20 top-1/2 -translate-y-1/2 pointer-events-none rotate-[-14deg]">
                <motion.div
                  animate={{ x: [20, 80], opacity: [0, 0.6, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0 }}
                  className="absolute top-0 w-20 h-0.5 bg-gradient-to-l from-transparent via-blue-400/60 to-transparent rounded-full"
                />
                <motion.div
                  animate={{ x: [10, 70], opacity: [0, 0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                  className="absolute top-8 w-16 h-0.5 bg-gradient-to-l from-transparent via-purple-400/50 to-transparent rounded-full"
                />
                <motion.div
                  animate={{ x: [15, 75], opacity: [0, 0.7, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                  className="absolute top-16 w-24 h-0.5 bg-gradient-to-l from-transparent via-pink-400/50 to-transparent rounded-full"
                />
                <motion.div
                  animate={{ x: [5, 60], opacity: [0, 0.4, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut", delay: 0.2 }}
                  className="absolute top-24 w-14 h-0.5 bg-gradient-to-l from-transparent via-blue-300/40 to-transparent rounded-full"
                />
                <motion.div
                  animate={{ x: [25, 85], opacity: [0, 0.5, 0] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                  className="absolute -top-8 w-18 h-0.5 bg-gradient-to-l from-transparent via-purple-300/40 to-transparent rounded-full"
                />
              </div>
              
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <img
                  src={HeroImage}
                  alt="DevExchange"
                  className="w-[320px] sm:w-[400px] h-auto relative z-10 drop-shadow-2xl"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="absolute -left-8 bottom-4 bg-gray-900/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 hidden sm:block"
              >
                <div className="text-sm font-semibold text-white">Open Source</div>
                <div className="text-xs text-gray-400">MIT License</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="absolute -right-8 top-4 bg-gray-900/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 hidden sm:block"
              >
                <div className="text-sm font-semibold text-blue-400">99%</div>
                <div className="text-xs text-gray-400">Keep Earnings</div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 pt-10 border-t border-white/5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto lg:mx-0">
            <div className="text-center lg:text-left">
              <div className="text-white font-medium mb-1">GitHub Integration</div>
              <div className="text-sm text-gray-500">Connect and sync your repos</div>
            </div>
            <div className="text-center lg:text-left">
              <div className="text-white font-medium mb-1">Solana Payments</div>
              <div className="text-sm text-gray-500">Fast, low-fee transactions</div>
            </div>
            <div className="text-center lg:text-left">
              <div className="text-white font-medium mb-1">Fair Pricing</div>
              <div className="text-sm text-gray-500">Keep up to 99% of sales</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
