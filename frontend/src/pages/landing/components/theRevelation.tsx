import { motion } from "framer-motion";

export default function TheShift() {
  return (
    <section
      className="py-32 px-6 md:px-12 bg-white dark:bg-[#050505] transition-colors duration-300 relative overflow-hidden"
      id="the-revelation"
    >
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden hidden md:flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="font-syne text-[20vw] font-black text-black dark:text-white whitespace-nowrap opacity-[0.03] dark:opacity-5 transform -rotate-12 transition-colors">
          REVELATION
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-3 mb-16 justify-center lg:justify-start">
          <div className="w-12 h-[2px] bg-red-500 transition-colors"></div>
          <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500 transition-colors">
            The Revelation
          </span>
          <div className="w-12 h-[2px] bg-red-500 transition-colors"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <h2 className="font-syne text-4xl md:text-6xl font-bold text-black dark:text-white uppercase leading-snug mb-8 transition-colors">
              A Direct Pipeline from{" "}
              <span className="text-black/40 dark:text-white/40">Commit</span>{" "}
              to{" "}
              <span className="inline-block text-white dark:text-black bg-black dark:bg-white px-2 py-0.5 leading-none transition-colors">
                PAYOUT
              </span>
              .
            </h2>
            <div className="space-y-6 font-space text-gray-600 dark:text-gray-400 text-lg md:text-xl transition-colors">
              <div className="py-2 text-black dark:text-white transition-colors">
                <p className="leading-relaxed">
                  You price listings in stable fiat. They execute via Web3
                  wallets. We handle the real-time conversion and secure archive
                  delivery in milliseconds.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1 flex flex-col gap-6"
          >
            {/* The 99% Block */}
            <div className="bg-red-500 text-white p-8 md:p-12 transition-colors flex flex-col justify-between">
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
            <div className="bg-gray-100 dark:bg-[#1a1a1a] border-2 border-black/10 dark:border-white/10 text-black dark:text-white p-8 md:p-12 transition-colors flex items-center justify-between">
              <div>
                <div className="font-space text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  Input Valuation
                </div>
                <div className="font-syne text-4xl font-black transition-colors">
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
                <div className="font-syne text-4xl font-black transition-colors">
                  SOL
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
