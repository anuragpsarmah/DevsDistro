import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import MechanicsDiagram from "./MechanicsDiagram";

export default function TheMechanics() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [hasStartedDiagram, setHasStartedDiagram] = useState(false);

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

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6 md:px-12 bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300"
      id="the-mechanics"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6 border-b-4 border-black/20 dark:border-white/20 pb-4 transition-colors w-fit mx-auto md:mx-0">
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs">
              The Mechanics
            </span>
          </div>
          <h2 className="font-syne text-5xl md:text-7xl font-black uppercase leading-none text-center md:text-left">
            How The Machine
            <br />
            <span className="text-black/40 dark:text-white/40">Operates.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <div className="border-t-2 border-l-2 border-r-2 border-black/20 dark:border-white/20 transition-colors">
            <MechanicsDiagram isRunning={hasStartedDiagram} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t-2 border-black/20 dark:border-white/20 transition-colors">
            <div className="border-b-2 border-l-2 border-r-2 border-black/20 dark:border-white/20 p-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 group">
              <div className="font-space text-4xl font-bold mb-8 text-black dark:text-white group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors">
                01.
              </div>
              <h3 className="font-syne text-2xl font-bold uppercase mb-4">
                The Repository
              </h3>
              <p className="text-justify font-space text-sm leading-relaxed text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-gray-300 transition-colors">
                Your intellectual property. DevsDistro allows sellers to easily
                select and monetize the codebases and high-value repositories
                they already own on GitHub.
              </p>
            </div>

            <div className="border-b-2 border-r-2 border-black/20 dark:border-white/20 p-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 group">
              <div className="font-space text-4xl font-bold mb-8 text-black dark:text-white group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors">
                02.
              </div>
              <h3 className="font-syne text-2xl font-bold uppercase mb-4">
                GitHub Sync
              </h3>
              <p className="text-justify font-space text-sm leading-relaxed text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-gray-300 transition-colors">
                Connect via standard GitHub OAuth and our native App
                Integration. This securely fetches your selected repositories so
                you can list them on the marketplace.
              </p>
            </div>

            <div className="border-b-2 border-r-2 border-black/20 dark:border-white/20 p-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 group">
              <div className="font-space text-4xl font-bold mb-8 text-black dark:text-white group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors">
                03.
              </div>
              <h3 className="font-syne text-2xl font-bold uppercase mb-4">
                Solana Settlement
              </h3>
              <p className="text-justify font-space text-sm leading-relaxed text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-gray-300 transition-colors">
                A buyer connects their Phantom or Solflare wallet. They execute
                the purchase on Solana, paying in USDC by default or native SOL
                when the seller enables it.
              </p>
            </div>

            <div className="border-b-2 border-l-2 border-r-2 border-black/20 dark:border-white/20 p-10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-300 group lg:col-span-3 bg-black/5 dark:bg-white/5 text-black dark:text-white">
              <div className="max-w-3xl">
                <div className="font-space text-4xl font-bold mb-8 text-gray-500 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors">
                  04.
                </div>
                <h3 className="font-syne text-3xl font-bold uppercase mb-4">
                  Archive Delivery
                </h3>
                <p className="text-justify font-space text-lg leading-relaxed text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-gray-300 transition-colors">
                  The instant the Solana transaction is validated on-chain,
                  DevsDistro orchestrates the secure downloading and compiling
                  of your repository into a downloadable ZIP file, immediately
                  served to the buyer. No manual labor required.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
