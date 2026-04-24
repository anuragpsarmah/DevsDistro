import { motion } from "framer-motion";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function TheShift() {
  const isLarge = useMediaQuery("(min-width: 1024px)");

  return (
    <section
      className="py-32 px-6 md:px-12 bg-white dark:bg-[#050505] transition-colors duration-300 relative"
      id="the-revelation"
    >
      {/* Constrained background container */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-7xl bg-white dark:bg-[#050505] -z-10 transition-colors duration-300 overflow-hidden">
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[120rem] pointer-events-none select-none overflow-hidden hidden md:flex items-center justify-center"
          aria-hidden="true"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
          }}
        >
          <div className="font-syne text-[20vw] font-black text-black dark:text-white whitespace-nowrap opacity-[0.03] dark:opacity-5 transform -rotate-12 transition-colors">
            REVELATION
          </div>
        </div>
      </div>
      <div className="landing-dotted-rule landing-dotted-b absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none z-20"></div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-3 mb-16 justify-center lg:justify-start">
          <div className="w-12 h-[2px] bg-red-500 transition-colors"></div>
          <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500 transition-colors">
            The Revelation
          </span>
          <div className="w-12 h-[2px] bg-red-500 transition-colors"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, ...(isLarge ? { x: 50 } : { y: 50 }) }}
            whileInView={{ opacity: 1, ...(isLarge ? { x: 0 } : { y: 0 }) }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <h2 className="font-syne text-3xl md:text-[3.6rem] font-bold text-black dark:text-white uppercase leading-snug mb-8 transition-colors">
              A Direct Pipeline from{" "}
              <span className="text-black/40 dark:text-white/40">Commit</span>{" "}
              to{" "}
              <span className="inline-block text-white dark:text-black bg-black dark:bg-white px-2 py-0.5 leading-none transition-colors">
                PAYOUT
              </span>
              .
            </h2>
            <div className="space-y-6 font-space text-gray-700 dark:text-gray-300 text-lg md:text-xl transition-colors">
              <div className="py-2 text-gray-700 dark:text-gray-300 transition-colors">
                <p className="text-justify leading-relaxed">
                  You price listings in stable fiat. They execute via Web3
                  wallets. We handle the real-time conversion and secure archive
                  delivery in milliseconds.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, ...(isLarge ? { x: -50 } : { y: 50 }) }}
            whileInView={{ opacity: 1, ...(isLarge ? { x: 0 } : { y: 0 }) }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1 flex flex-col gap-6"
          >
            {/* The 99% Block */}
            <div className="bg-red-500 text-white p-8 md:p-12 transition-all duration-300 flex flex-col justify-between shadow-[0_18px_40px_-32px_rgba(0,0,0,0.5)] dark:shadow-[0_18px_42px_-32px_rgba(0,0,0,0.86)]">
              <div className="flex items-center justify-between mb-8">
                <span className="font-space font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">
                  Creator Retention
                </span>
                <span className="font-space font-bold uppercase tracking-widest text-[10px] text-white/80">
                  1% Protocol Fee
                </span>
              </div>
              <div className="font-syne text-[7rem] md:text-[9rem] font-black leading-none tracking-tighter">
                99<span className="text-5xl md:text-6xl">%</span>
              </div>
            </div>

            {/* The Conversion Block */}
            <div className="bg-gray-100 dark:bg-[#1a1a1a] border-2 border-black/10 dark:border-white/10 text-black dark:text-white p-8 md:p-12 transition-all duration-300 flex items-center justify-between shadow-[0_14px_32px_-28px_rgba(0,0,0,0.42)] dark:shadow-[0_14px_34px_-28px_rgba(0,0,0,0.78)]">
              <div>
                <div className="font-space text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  Input Valuation
                </div>
                <div className="font-syne text-3xl font-black transition-colors">
                  USD
                </div>
              </div>
              <div className="text-red-500 font-bold text-3xl animate-pulse mx-4">
                →
              </div>
              <div className="text-right">
                <div className="font-space text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  Output Settlement
                </div>
                <div className="font-syne text-3xl font-black transition-colors">
                  USDC / SOL
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
