import { motion } from "framer-motion";
import BackgroundDots from "@/components/ui/backgroundDots";

export default function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-black dark:text-white p-4 relative overflow-hidden bg-white dark:bg-[#050505] selection:bg-red-500 selection:text-white transition-colors duration-300">
      <BackgroundDots />

      <div className="z-10 text-center flex flex-col items-center">
        <motion.div
          className="mb-12 w-24 h-24 border-4 border-black dark:border-white bg-transparent relative flex items-center justify-center"
          animate={{
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{
            duration: 2,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          <div className="w-12 h-12 bg-red-500 absolute" />
        </motion.div>

        <motion.h1
          className="text-4xl md:text-6xl font-syne font-black uppercase tracking-widest mb-4 transition-colors duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          DevsDistro
        </motion.h1>

        <motion.div
          className="h-1 w-32 bg-red-500 mx-auto mt-4"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
        />
      </div>
    </div>
  );
}
