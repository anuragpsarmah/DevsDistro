import { motion } from "framer-motion";

export default function TheShift() {
  return (
    <section className="py-32 px-6 md:px-12 bg-white dark:bg-[#050505] transition-colors duration-300 relative overflow-hidden" id="the-revelation">

      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
        <h2 className="font-syne text-[20vw] font-black text-black dark:text-white whitespace-nowrap opacity-[0.03] dark:opacity-5 transform -rotate-12 transition-colors">
          REVELATION
        </h2>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-3 mb-16 justify-center">
          <div className="w-12 h-[2px] bg-black dark:bg-white transition-colors"></div>
          <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-black dark:text-white transition-colors">The Revelation</span>
          <div className="w-12 h-[2px] bg-black dark:bg-white transition-colors"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="order-2 md:order-1"
          >
            <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-800 transition-colors">
              <div className="bg-gray-50 dark:bg-[#0a0a0a] p-8 aspect-square flex flex-col justify-between group hover:bg-black dark:hover:bg-white transition-colors duration-300">
                <span className="font-space text-gray-500 text-sm group-hover:text-gray-400">01</span>
                <div>
                  <h3 className="font-syne text-2xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black mb-2 uppercase transition-colors">Connect</h3>
                  <p className="font-space text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors">Link your GitHub repository in seconds. Fluid, painless onboarding.</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#0a0a0a] p-8 aspect-square flex flex-col justify-between group hover:bg-black dark:hover:bg-white transition-colors duration-300">
                <span className="font-space text-gray-500 text-sm group-hover:text-gray-400">02</span>
                <div>
                  <h3 className="font-syne text-2xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black mb-2 uppercase transition-colors">Price</h3>
                  <p className="font-space text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors">Set your desired value in USD. Get paid exclusively in SOL.</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#0a0a0a] p-8 aspect-square flex flex-col justify-between group hover:bg-black dark:hover:bg-white transition-colors duration-300">
                <span className="font-space text-gray-500 text-sm group-hover:text-gray-400">03</span>
                <div>
                  <h3 className="font-syne text-2xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black mb-2 uppercase transition-colors">Deliver</h3>
                  <p className="font-space text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors">Buyers instantly receive a complete, downloadable ZIP archive of the project.</p>
                </div>
              </div>
              <div className="bg-red-500 p-8 aspect-square flex flex-col justify-between group hover:bg-black dark:hover:bg-white transition-colors duration-300">
                <span className="font-space text-white/70 text-sm group-hover:text-gray-400">04</span>
                <div>
                  <h3 className="font-syne text-2xl font-bold text-white dark:text-black group-hover:text-white dark:group-hover:text-black mb-2 uppercase transition-colors">Earn</h3>
                  <p className="font-space text-sm text-white/90 dark:text-black/80 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors">We take a 1% platform fee. You retain 99% of the value from your intellectual property.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="order-1 md:order-2"
          >
            <h2 className="font-syne text-4xl md:text-6xl font-bold text-black dark:text-white uppercase leading-snug mb-8 transition-colors">
              A Direct Pipeline from{" "}
              <span className="text-black/40 dark:text-white/40">Commit</span>
              {" "}to <span className="inline-block text-white dark:text-black bg-black dark:bg-white px-2 py-0.5 leading-none transition-colors">PAYOUT</span>.
            </h2>
            <div className="space-y-6 font-space text-gray-600 dark:text-gray-400 text-lg transition-colors">
              <p>

                DevsDistro connects you with a global audience of developers and builders through frictionless Solana settlements.
              </p>
              <p className="border-l-2 border-red-500 pl-4 text-black dark:text-white transition-colors">
                You price it in fiat. They pay via Web3 wallets. We handle the conversion and the secure ZIP delivery in milliseconds.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
