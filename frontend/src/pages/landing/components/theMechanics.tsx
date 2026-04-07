import { motion } from "framer-motion";

export default function TheMechanics() {
  return (
    <section
      className="py-32 px-6 md:px-12 bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300"
      id="the-mechanics"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-20"
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
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t-2 border-black/20 dark:border-white/20 transition-colors"
        >
          <div className="border-b-2 border-l-2 border-r-2 border-black/20 dark:border-white/20 p-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 group">
            <div className="font-space text-4xl font-bold mb-8 text-black dark:text-white group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors">
              01.
            </div>
            <h3 className="font-syne text-2xl font-bold uppercase mb-4">
              OAuth & App Sync
            </h3>
            <p className="font-space text-sm leading-relaxed text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-gray-300 transition-colors">
              Begin with standard GitHub OAuth, followed by our native GitHub
              App Integration. This grants DevsDistro the specific scoped access
              needed to securely fetch your repository for packaging.
            </p>
          </div>

          <div className="border-b-2 border-r-2 border-black/20 dark:border-white/20 p-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 group bg-white dark:bg-[#050505]">
            <div className="font-space text-4xl font-bold mb-8 text-black dark:text-white group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors">
              02.
            </div>
            <h3 className="font-syne text-2xl font-bold uppercase mb-4">
              Set Valuation
            </h3>
            <p className="font-space text-sm leading-relaxed text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-gray-300 transition-colors">
              List your repository metadata on the global marketplace. Set the
              purchase price in standard USD fiat for total clarity and
              stability.
            </p>
          </div>

          <div className="border-b-2 border-r-2 border-black/20 dark:border-white/20 p-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 group">
            <div className="font-space text-4xl font-bold mb-8 text-black dark:text-white group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors">
              03.
            </div>
            <h3 className="font-syne text-2xl font-bold uppercase mb-4">
              Solana Settlement
            </h3>
            <p className="font-space text-sm leading-relaxed text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-gray-300 transition-colors">
              A buyer connects their Phantom or Solflare wallet. They execute
              the purchase on Solana, paying in USDC by default or native SOL
              when the seller enables it. Block confirmation occurs in
              sub-seconds.
            </p>
          </div>

          <div className="border-b-2 border-l-2 border-r-2 border-black/20 dark:border-white/20 p-10 hover:bg-red-500 dark:hover:bg-red-500 hover:text-white dark:hover:text-black transition-colors duration-300 group lg:col-span-3 bg-black/5 dark:bg-white/5 text-black dark:text-white">
            <div className="max-w-3xl">
              <div className="font-space text-4xl font-bold mb-8 text-gray-500 dark:text-gray-500 group-hover:text-white dark:group-hover:text-black transition-colors">
                04.
              </div>
              <h3 className="font-syne text-3xl font-bold uppercase mb-4">
                Automated Archive Delivery
              </h3>
              <p className="font-space text-lg leading-relaxed text-gray-600 dark:text-gray-400 group-hover:text-white dark:group-hover:text-black transition-colors">
                The instant the Solana transaction is validated on-chain,
                DevsDistro orchestrates the secure downloading and compiling of
                your repository into a downloadable ZIP file, immediately served
                to the buyer. No manual labor required.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
