import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const fadeVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export default function SmoothTransitionWrapper() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    // <AnimatePresence mode="wait">
    //   <motion.div
    //     key={location.pathname}
    //     variants={fadeVariants}
    //     initial="initial"
    //     animate="animate"
    //     exit="exit"
    //     transition={{ duration: 0.01 }}
    //     className="min-h-screen w-full flex flex-col"
    //   >
    //     {outlet}
    //   </motion.div>
    // </AnimatePresence>
    <>{outlet}</>
  );
}
