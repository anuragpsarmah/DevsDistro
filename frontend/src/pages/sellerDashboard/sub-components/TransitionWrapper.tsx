import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { TransitionWrapperProps } from "../utils/types";

const fadeVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const TransitionWrapper = ({
  isTransitioning,
  children,
  identifier,
}: TransitionWrapperProps) => {
  if (isTransitioning) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={identifier}
        variants={fadeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
