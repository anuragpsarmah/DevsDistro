import { ReactNode } from "react";
import { motion } from "framer-motion";

interface AnimatedLoadWrapperProps {
  children: ReactNode;
  duration?: number;
}

export default function AnimatedLoadWrapper({
  children,
  duration = 0.4,
}: AnimatedLoadWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 0.9, y: 0 }}
      transition={{ duration, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
