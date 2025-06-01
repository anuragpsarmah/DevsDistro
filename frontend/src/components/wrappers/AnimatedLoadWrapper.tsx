import { ReactNode } from "react";
import { motion } from "framer-motion";

interface AnimatedLoadWrapperProps {
  children: ReactNode;
  duration?: number;
}

export default function AnimatedLoadWrapper({
  children,
  duration = 1,
}: AnimatedLoadWrapperProps) {
  return (
    <motion.h1
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration }}
    >
      {children}
    </motion.h1>
  );
}
