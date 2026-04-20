import { ArrowRight, Code2 } from "lucide-react";
import noiseUrl from "@/assets/noise.svg";
import { BackgroundRippleEffect } from "./BackgroundRippleEffect";

interface PrologueProps {
  handleAuthNavigate: () => void;
}

export default function Prologue({ handleAuthNavigate }: PrologueProps) {
  return (
    <section
      className="min-h-[90vh] flex flex-col justify-center relative px-6 md:px-12 pt-48 pb-24 bg-white dark:bg-[#050505] transition-colors duration-300"
      id="the-introduction"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-7xl bg-white dark:bg-[#050505] z-0 transition-colors duration-300 overflow-hidden">
        <BackgroundRippleEffect autoPlayCenter />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-[5]"
          style={{
            backgroundImage: `url(${noiseUrl})`,
          }}
        ></div>

        {/* Premium Top Fade & Blur Composites */}
        <div
          className="absolute inset-x-0 top-0 h-64 sm:h-80 pointer-events-none z-[6]"
          style={{
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            maskImage: "linear-gradient(to top, transparent 0%, black 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, transparent 0%, black 100%)",
          }}
        ></div>
        <div className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-white dark:from-[#050505] to-transparent pointer-events-none z-[7] transition-colors duration-300"></div>

        {/* Premium Bottom Fade & Blur Composites */}
        <div
          className="absolute inset-x-0 bottom-0 h-40 sm:h-56 pointer-events-none z-[6]"
          style={{
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 100%)",
          }}
        ></div>
        <div className="absolute inset-x-0 bottom-0 h-28 sm:h-40 bg-gradient-to-t from-white dark:from-[#050505] to-transparent pointer-events-none z-[7] transition-colors duration-300"></div>
      </div>
      <div className="landing-dotted-rule landing-dotted-b absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none z-20"></div>

      <div className="max-w-6xl mx-auto w-full relative z-10 pointer-events-none">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-4 mb-8 justify-center pointer-events-auto">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              DevsDistro
            </span>
            <div className="w-12 h-[2px] bg-red-500"></div>
          </div>

          <h1 className="font-syne text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] text-black dark:text-white tracking-[0.08em] uppercase pointer-events-auto select-text">
            <span className="block md:whitespace-nowrap">A REPOSITORY</span>
            <span className="block md:whitespace-nowrap">MARKET THAT</span>
            <span
              className="block text-red-500 mix-blend-normal md:whitespace-nowrap"
              style={{ WebkitTextStroke: "0px" }}
            >
              WORKS
              <span className="text-black dark:text-white">.</span>
            </span>
          </h1>

          <p className="font-space mt-10 text-base md:text-2xl text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed tracking-wide mx-auto pointer-events-auto select-text">
            Open marketplace where creators sell repositories priced in USD,
            settled on Solana, delivered instantly.
          </p>

          <div className="relative z-30 mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center pointer-events-auto">
            <button
              onClick={handleAuthNavigate}
              className="inline-flex items-center gap-2 px-8 py-4 font-space font-bold uppercase tracking-widest text-white dark:text-black bg-black dark:bg-white hover:bg-red-500 dark:hover:bg-red-500 hover:text-white transition-colors duration-200 border-2 border-transparent hover:border-black dark:hover:border-white"
            >
              Init Setup <Code2 size={18} />
            </button>
            <a
              href="#the-mechanics"
              className="inline-flex items-center gap-2 px-8 py-4 bg-neutral-100/95 text-black dark:bg-[#050505]/90 dark:text-white font-space font-bold uppercase tracking-widest transition-all duration-200 border-2 border-black/15 dark:border-white/15 ring-1 ring-black/5 dark:ring-white/10 shadow-[0_10px_24px_-22px_rgba(0,0,0,0.45)] dark:shadow-[0_10px_24px_-22px_rgba(255,255,255,0.28)] hover:bg-neutral-200/90 hover:border-black/40 dark:hover:border-white/40 hover:shadow-[0_14px_30px_-24px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_14px_30px_-24px_rgba(255,255,255,0.35)]"
            >
              View Flow <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
