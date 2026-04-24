import { ArrowRight, Code2 } from "lucide-react";
import githubLockupBlackUrl from "@/assets/brand/github-lockup-black.svg?url";
import noiseUrl from "@/assets/noise.svg?url";
import solanaLogoUrl from "@/assets/brand/solana-logo.svg?url";
import { BackgroundRippleEffect } from "./BackgroundRippleEffect";
import { landingPrimaryButtonClassName } from "./landingButtonStyles";

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
          className="absolute inset-x-0 bottom-0 h-64 sm:h-80 pointer-events-none z-[6]"
          style={{
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 100%)",
          }}
        ></div>
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-white dark:from-[#050505] to-transparent pointer-events-none z-[7] transition-colors duration-300"></div>
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

          <h1 className="font-syne text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] text-neutral-800 dark:text-white tracking-[0.08em] uppercase pointer-events-auto select-text">
            <span className="block md:whitespace-nowrap">A REPOSITORY</span>
            <span className="block md:whitespace-nowrap">MARKET THAT</span>
            <span
              className="block text-red-500 mix-blend-normal md:whitespace-nowrap"
              style={{ WebkitTextStroke: "0px" }}
            >
              WORKS
              <span className="text-neutral-800 dark:text-white">.</span>
            </span>
          </h1>

          <p className="font-space mt-10 text-base md:text-2xl text-gray-700 dark:text-gray-300 max-w-2xl leading-relaxed tracking-wide mx-auto pointer-events-auto select-text">
            Open marketplace where creators sell repositories priced in USD,
            settled on Solana, delivered instantly.
          </p>

          <div className="relative z-30 mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center pointer-events-auto">
            <button
              onClick={handleAuthNavigate}
              className={landingPrimaryButtonClassName}
            >
              Init Setup <Code2 size={18} />
            </button>
            <a
              href="#the-mechanics"
              className="inline-flex items-center gap-2 border-[3px] border-neutral-800/35 bg-neutral-200/90 px-8 py-4 font-space font-bold uppercase tracking-widest text-neutral-800 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.9),inset_0_0_22px_rgba(255,255,255,0.18),0_10px_22px_-18px_rgba(38,38,38,0.34)] transition-all duration-200 hover:border-neutral-800/50 hover:bg-neutral-300/90 hover:shadow-[inset_0_0_0_2px_rgba(255,255,255,1),inset_0_0_26px_rgba(255,255,255,0.25),0_10px_22px_-18px_rgba(38,38,38,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 dark:border-white/35 dark:bg-[#151515]/95 dark:text-white dark:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.14),inset_0_0_22px_rgba(255,255,255,0.08),0_10px_24px_-18px_rgba(38,38,38,0.72)] dark:hover:border-white/50 dark:hover:bg-[#202020]/95 dark:hover:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.2),inset_0_0_26px_rgba(255,255,255,0.12),0_10px_24px_-18px_rgba(38,38,38,0.72)]"
            >
              View Flow <ArrowRight size={18} />
            </a>
          </div>

          <div className="mt-20 md:mt-24 flex flex-col items-center justify-center w-full pointer-events-auto">
            <div className="text-center font-space text-[15px] font-medium text-neutral-900 dark:text-white mb-6">
              DevsDistro is powered by
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repositories"
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border-[3px] border-neutral-300 bg-white p-[2px] shadow-[0_4px_12px_rgba(38,38,38,0.06)] dark:border-neutral-700 dark:bg-[#050505] dark:shadow-[0_4px_12px_rgba(38,38,38,0.5)]">
                  <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-neutral-200 dark:bg-neutral-700">
                    <div className="h-[25px] w-[25.5px] overflow-hidden relative">
                      <img
                        src={githubLockupBlackUrl}
                        alt=""
                        className="absolute top-0 left-0 h-[25px] w-auto max-w-none dark:invert dark:opacity-[0.85]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start font-space leading-tight">
                  <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                    GitHub
                  </span>
                  <span className="mt-0.5 text-[13px] font-medium text-neutral-400 dark:text-neutral-500">
                    Repositories
                  </span>
                </div>
              </a>

              <a
                href="https://solana.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Solana settlements"
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border-[3px] border-neutral-300 bg-white p-[2px] shadow-[0_4px_12px_rgba(38,38,38,0.06)] dark:border-neutral-700 dark:bg-[#050505] dark:shadow-[0_4px_12px_rgba(38,38,38,0.5)]">
                  <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-[20px] w-[23px] bg-neutral-800 dark:bg-neutral-200"
                      style={{
                        maskImage: `url(${solanaLogoUrl})`,
                        maskSize: "auto 100%",
                        maskPosition: "left center",
                        maskRepeat: "no-repeat",
                        WebkitMaskImage: `url(${solanaLogoUrl})`,
                        WebkitMaskSize: "auto 100%",
                        WebkitMaskPosition: "left center",
                        WebkitMaskRepeat: "no-repeat",
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-start font-space leading-tight">
                  <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                    Solana
                  </span>
                  <span className="mt-0.5 text-[13px] font-medium text-neutral-400 dark:text-neutral-500">
                    Settlement
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
