import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import noiseUrl from "@/assets/noise.svg";

interface TheClimaxProps {
  handleAuthNavigate: () => void;
}

export default function TheClimax({ handleAuthNavigate }: TheClimaxProps) {
  return (
    <section
      className="py-32 px-6 md:px-12 bg-white dark:bg-[#050505] text-black dark:text-white transition-colors duration-300 overflow-hidden relative"
      id="the-climax"
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url(${noiseUrl})` }}
      ></div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-red-500 p-8 md:p-16 border-4 border-black dark:border-white transform -skew-y-2 hover:skew-y-0 transition-all duration-500"
        >
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="w-8 h-[2px] bg-black dark:bg-white transition-colors"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-black dark:text-white transition-colors">
              The Climax
            </span>
            <div className="w-8 h-[2px] bg-black dark:bg-white transition-colors"></div>
          </div>

          <h2 className="font-syne text-4xl md:text-7xl font-black uppercase leading-none mb-8 text-black dark:text-black transition-colors">
            Stop giving your
            <br />
            margin to the middleman.
          </h2>

          <p className="font-space text-xl md:text-2xl text-black dark:text-black font-medium mb-10 max-w-2xl mx-auto transition-colors">
            Take control of your codebase economics today. Open source is great,
            but securing your financial upside is better.
          </p>

          <button
            onClick={handleAuthNavigate}
            className="group inline-flex items-center gap-4 bg-black text-white px-10 py-5 font-space font-bold text-lg uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300 border-2 border-black"
          >
            <span>Execute Join()</span>
            <ChevronRight className="group-hover:translate-x-2 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
