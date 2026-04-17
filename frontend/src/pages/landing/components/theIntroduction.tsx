import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import noiseUrl from "@/assets/noise.svg";

interface PrologueProps {
  handleAuthNavigate: () => void;
}

export default function Prologue({ handleAuthNavigate }: PrologueProps) {
  return (
    <section
      className="min-h-[90vh] flex flex-col justify-center relative px-6 md:px-12 pt-32 pb-24 bg-white dark:bg-[#0a0a0a] border-b-2 border-black/10 dark:border-white/10 transition-colors duration-300"
      id="the-introduction"
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url(${noiseUrl})`,
        }}
      ></div>
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[120rem] pointer-events-none z-0 opacity-25 dark:hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 25%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 50%, black 25%, transparent 75%)",
        }}
      ></div>
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[120rem] pointer-events-none z-0 opacity-60 hidden dark:block"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 25%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 50%, black 25%, transparent 75%)",
        }}
      ></div>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
        <div className="lg:col-span-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-8 justify-center md:justify-start"
          >
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              DevsDistro
            </span>
            <div className="w-12 h-[2px] bg-red-500"></div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-syne text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] text-black dark:text-white tracking-[0.08em] uppercase text-center md:text-left"
          >
            <span className="block md:whitespace-nowrap">A REPOSITORY</span>
            <span className="block md:whitespace-nowrap">MARKET THAT</span>
            <span
              className="block text-red-500 mix-blend-normal md:whitespace-nowrap"
              style={{ WebkitTextStroke: "0px" }}
            >
              WORKS
              <span className="text-black dark:text-white">.</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="font-space mt-10 text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed tracking-wide text-center md:text-left mx-auto md:mx-0"
          >
            Open marketplace where creators sell repositories — priced in USD,
            settled on Solana, delivered instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-12 flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center md:items-start"
          >
            <button
              onClick={handleAuthNavigate}
              className="group relative px-8 py-4 bg-black text-white dark:bg-white dark:text-black font-space font-bold uppercase tracking-widest overflow-hidden transition-colors"
            >
              <div className="absolute inset-0 w-0 bg-red-500 transition-all transition-duration-[250ms] ease-out group-hover:w-full"></div>
              <span className="relative z-10 group-hover:text-white dark:group-hover:text-black transition-colors duration-200 flex items-center gap-2">
                Init Setup <Code2 size={18} />
              </span>
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="lg:col-span-4 hidden lg:flex flex-col justify-end items-end"
        >
          <div className="border-r-2 border-red-500 pr-6 py-2 flex flex-col gap-3 font-space text-[10px] sm:text-xs uppercase tracking-widest text-gray-500">
            <div className="text-black dark:text-white font-bold mb-4 text-right">
              System Diagnostics
            </div>
            <div className="flex justify-end gap-6 text-right">
              <span>Status:</span>
              <span className="text-black dark:text-white w-24 text-left">
                Operational
              </span>
            </div>
            <div className="flex justify-end gap-6 text-right">
              <span>Version:</span>
              <span className="text-red-500 w-24 text-left">V_1.0.0</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
