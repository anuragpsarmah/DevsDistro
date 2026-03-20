import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

import { faqs } from "../utils/constants";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-32 px-6 md:px-12 bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white border-b-2 border-black/10 dark:border-white/10 transition-colors duration-300" id="query-log">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-16">
          <div className="md:w-1/3">
            <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
              <div className="w-12 h-[2px] bg-red-500"></div>
              <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">Query Log</span>
              <div className="w-12 h-[2px] bg-red-500"></div>
            </div>
            <h2 className="font-syne text-4xl md:text-5xl font-black uppercase leading-tight mb-6 transition-colors text-center md:text-left">
              Frequently<br />
              <span className="text-black/40 dark:text-white/40">Asked.</span>
            </h2>
            <p className="font-space text-gray-600 dark:text-gray-500 text-sm transition-colors text-center md:text-left">
              Operational specifications and technical constraints regarding DevsDistro.
            </p>
          </div>

          <div className="md:w-2/3 border-t-2 border-black/20 dark:border-white/20 transition-colors">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b-2 border-black/20 dark:border-white/20 overflow-hidden group transition-colors">
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full text-left py-8 flex justify-between items-center bg-transparent group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-200 px-4"
                >
                  <span className="font-syne text-xl md:text-2xl font-bold uppercase pr-8 transition-colors">
                    {faq.question}
                  </span>
                  <div className="text-red-500 shrink-0">
                    {openIndex === idx ? <Minus size={24} /> : <Plus size={24} />}
                  </div>
                </button>
                <AnimatePresence>
                  {openIndex === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-4 pb-8 overflow-hidden"
                    >
                      <p className="font-space text-gray-600 dark:text-gray-400 text-base md:text-lg leading-relaxed transition-colors">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
