import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { faqs } from "../utils/constants";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const iconTransition = hasMounted
    ? {
        duration: 0.24,
        ease: [0.22, 1, 0.36, 1] as const,
      }
    : { duration: 0 };

  const panelTransition = hasMounted
    ? {
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1] as const,
      }
    : { duration: 0 };

  return (
    <section
      className="py-32 px-6 md:px-12 bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white border-b-2 border-black/10 dark:border-white/10 transition-colors duration-300"
      id="query-log"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-16">
          <div className="md:w-1/3">
            <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
              <div className="w-12 h-[2px] bg-red-500"></div>
              <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
                Query Log
              </span>
              <div className="w-12 h-[2px] bg-red-500"></div>
            </div>
            <h2
              id="faq-heading"
              className="font-syne text-4xl md:text-5xl font-black uppercase leading-tight mb-6 transition-colors text-center md:text-left"
            >
              Frequently
              <br />
              <span className="text-black/40 dark:text-white/40">Asked.</span>
            </h2>
            <p className="font-space text-gray-600 dark:text-gray-500 text-sm transition-colors text-center md:text-left">
              Operational specifications and technical constraints regarding
              DevsDistro.
            </p>
          </div>

          <div className="md:w-2/3 border-t-2 border-black/20 dark:border-white/20 transition-colors">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;

              return (
                <motion.div
                  layout={hasMounted}
                  key={faq.question}
                  className="border-b-2 border-black/20 dark:border-white/20 overflow-hidden group transition-colors"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full text-left py-8 flex justify-between items-center bg-transparent group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-200 px-4"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${idx}`}
                  >
                    <span
                      id={`faq-question-${idx}`}
                      className="font-syne text-xl md:text-2xl font-bold uppercase pr-8 transition-colors"
                    >
                      {faq.question}
                    </span>
                    <motion.span
                      initial={false}
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={iconTransition}
                      className="text-red-500 shrink-0"
                    >
                      <Plus size={24} />
                    </motion.span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      gridTemplateRows: isOpen ? "1fr" : "0fr",
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={panelTransition}
                    className="grid px-4"
                    id={`faq-panel-${idx}`}
                    role="region"
                    aria-hidden={!isOpen}
                    aria-labelledby={`faq-question-${idx}`}
                  >
                    <div className="overflow-hidden">
                      <motion.p
                        initial={false}
                        animate={{ y: isOpen ? 0 : -8 }}
                        transition={panelTransition}
                        className="text-justify pb-8 font-space text-gray-600 dark:text-gray-400 text-base md:text-lg leading-relaxed transition-colors"
                      >
                        {faq.answer}
                      </motion.p>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
