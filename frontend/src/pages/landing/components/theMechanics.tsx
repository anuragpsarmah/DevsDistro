import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MechanicsDiagram from "./MechanicsDiagram";
import { Lock } from "lucide-react";

const NODE_SEQUENCE_MS = 2800;

const STEPS = [
  {
    title: "The Repository",
    description:
      "Your intellectual property. DevsDistro allows sellers to easily integrate and monetize the private repositories they already own on GitHub. No extra setup required.",
  },
  {
    title: "Integration",
    description:
      "Connect via standard GitHub OAuth and our native App Integration. This securely fetches your selected repositories so you can instantly list them.",
  },
  {
    title: "Solana Settlement",
    description:
      "A buyer connects their Phantom or Solflare wallet and executes the purchase on-chain. Settled instantly in USDC or native SOL.",
  },
  {
    title: "Archive Delivery",
    description:
      "The instant the Solana transaction is validated on-chain, DevsDistro orchestrates the secure downloading and compiling of your repository into a downloadable ZIP file, immediately served to the buyer. No manual labor required.",
  },
];

export default function TheMechanics() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [hasStartedDiagram, setHasStartedDiagram] = useState(false);
  const [autoMechanicIndex, setAutoMechanicIndex] = useState<number>(0);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || hasStartedDiagram) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setHasStartedDiagram(true);
        observer.disconnect();
      },
      {
        threshold: 0.35,
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [hasStartedDiagram]);

  useEffect(() => {
    if (!hasStartedDiagram) {
      return;
    }

    const interval = window.setInterval(() => {
      setAutoMechanicIndex((previousIndex) => (previousIndex + 1) % 4);
    }, NODE_SEQUENCE_MS);

    return () => window.clearInterval(interval);
  }, [hasStartedDiagram]);

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6 md:px-12 bg-white dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors duration-300 relative"
      id="the-mechanics"
    >
      <div className="landing-dotted-rule landing-dotted-b absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none z-20"></div>
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6 border-b-4 border-black/20 dark:border-white/20 pb-4 inline-flex transition-colors w-fit mx-auto md:mx-0">
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs">
              The Mechanics
            </span>
          </div>
          <h2 className="font-syne text-5xl md:text-7xl font-black uppercase leading-none text-center md:text-left tracking-widest break-words hyphens-auto">
            How The Machine
            <br />
            <span className="text-neutral-900/30 dark:text-white/30">
              Operates.
            </span>
          </h2>
        </div>

        <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#050505] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col">
          {/* Mac Window Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm relative z-20">
            <div className="group flex space-x-2 absolute left-4 items-center">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10 dark:border-white/10 transition-shadow hover:shadow-[0_0_8px_rgba(255,95,86,0.6)]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10 dark:border-white/10 transition-shadow hover:shadow-[0_0_8px_rgba(255,189,46,0.6)]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10 dark:border-white/10 transition-shadow hover:shadow-[0_0_8px_rgba(39,201,63,0.6)]"></div>
            </div>

            {/* Clean Browser Address bar */}
            <div className="mx-auto bg-white/50 dark:bg-black/50 border border-neutral-200 dark:border-white/10 rounded-md px-3 py-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 font-space flex items-center gap-2 shadow-sm w-64 justify-center">
              <Lock size={10} className="opacity-70" />
              <span>devsdistro.com/mechanics</span>
            </div>
          </div>

          {/* Browser Tabs */}
          <div className="flex px-2 pt-2 border-b border-neutral-200 dark:border-white/10 bg-neutral-100/50 dark:bg-neutral-950/50 gap-2 overflow-hidden z-10">
            <div className="px-4 py-2 bg-white dark:bg-[#050505] border-t border-l border-r border-neutral-200 dark:border-white/10 rounded-t-lg text-xs font-space font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2 min-w-[140px] relative uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              Pipeline
              {/* Active Tab line overlay to hide bottom border */}
              <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white dark:bg-[#050505]"></div>
            </div>
            <div className="px-4 py-2 text-xs font-space font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-600 flex items-center gap-2 min-w-[140px] hover:bg-black/5 dark:hover:bg-white/5 rounded-t-lg transition-colors cursor-pointer">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></div>
              Raw Data
            </div>
          </div>

          <div className="flex flex-col md:flex-row bg-white dark:bg-[#050505] flex-1">
            {/* Sidebar */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-white/10 p-6 md:p-8 flex flex-col justify-center bg-neutral-50/30 dark:bg-neutral-900/10">
              <div className="font-space font-bold text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-8 pb-4 border-b border-neutral-200 dark:border-white/10">
                Execution Steps
              </div>
              <ul className="space-y-4 relative">
                {STEPS.map((step, idx) => {
                  const isActive = autoMechanicIndex === idx;
                  return (
                    <li
                      key={idx}
                      className="relative z-10 group cursor-default"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-sidebar-tab"
                          className="absolute -inset-y-3 -inset-x-4 bg-white dark:bg-[#151515] rounded-xl border border-neutral-200 shadow-sm dark:border-white/5"
                          transition={{
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.6,
                          }}
                        />
                      )}
                      <div
                        className={`relative px-2 py-1 transition-colors duration-300 flex flex-col gap-1 ${isActive ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-600"}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-space font-bold text-xs ${isActive ? "text-red-500" : ""}`}
                          >
                            0{idx + 1}.
                          </span>
                          <span className="font-syne text-sm md:text-base font-bold uppercase tracking-widest">
                            {step.title}
                          </span>
                        </div>
                        {/* Animated Cursor */}
                        {isActive && (
                          <motion.div
                            layoutId="mechanics-cursor"
                            className="absolute -right-4 top-1/2 -translate-y-1/2 z-50 drop-shadow-xl pointer-events-none"
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              className="fill-neutral-900 dark:fill-white stroke-white dark:stroke-neutral-900"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M6 3L18 12L12 14L9 21L6 3Z"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Main Content Area */}
            <div className="w-full md:w-2/3 p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
              {/* Graph Paper Background Overlay */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjYWFhIiBmaWxsLW9wYWNpdHk9IjAuNSIvPgo8L3N2Zz4=')] opacity-15 dark:opacity-25 pointer-events-none z-0 mix-blend-normal"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white dark:from-[#050505] dark:via-transparent dark:to-[#050505] pointer-events-none z-0"></div>

              {/* SVG (MechanicsDiagram) */}
              <div className="w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 mb-10 relative z-10 min-h-[220px] md:min-h-[300px] flex items-center justify-center [&_svg]:!min-w-0 [&_svg]:!w-full [&_svg]:max-w-[1000px] transition-transform">
                <MechanicsDiagram
                  activeIndex={autoMechanicIndex}
                  isRunning={hasStartedDiagram}
                />
              </div>

              {/* Text changes below SVG */}
              <div className="w-full relative z-10 flex flex-col justify-end pb-2 border-t border-dashed border-neutral-300 dark:border-neutral-800 pt-8">
                <div className="flex gap-4 items-start">
                  <div className="relative w-full h-[160px] md:h-[120px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={autoMechanicIndex}
                        className="absolute inset-0"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3 }}
                      >
                        <h3 className="font-syne text-xl md:text-2xl font-bold uppercase mb-3 tracking-widest text-neutral-900 dark:text-white leading-none">
                          {STEPS[autoMechanicIndex].title}
                        </h3>
                        <p className="font-space text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed text-justify max-w-2xl">
                          {STEPS[autoMechanicIndex].description}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
