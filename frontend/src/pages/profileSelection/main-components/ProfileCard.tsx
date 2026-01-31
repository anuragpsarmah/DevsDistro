import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ProfileCardProps } from "../util/types";

export function ProfileCard({
  title,
  description,
  icon,
  features,
  onClick,
  isHovered,
  setHovered,
  setNotHovered,
  gradient,
  delay,
}: ProfileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 0.9, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative group h-full"
      onMouseEnter={setHovered}
      onMouseLeave={setNotHovered}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-20 blur-xl rounded-2xl transition-opacity duration-500`} />
      
      <motion.div
        className="relative h-full bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg p-8 flex flex-col cursor-pointer overflow-hidden"
        onClick={onClick}
        whileHover={{ scale: 1.02, y: -5 }}
        transition={{ duration: 0.3 }}
      >
         <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center mb-6`}>
            {icon}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed flex-grow">{description}</p>
          
          <ul className="space-y-3 mb-8">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-sm text-gray-300">
                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${gradient}`} />
                {feature}
              </li>
            ))}
          </ul>
          
          <div className={`flex items-center gap-2 text-sm font-medium bg-gradient-to-r ${gradient} bg-clip-text text-transparent mt-auto`}>
            <span>Continue as {title}</span>
            <ArrowRight size={16} className={`transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} style={{ color: title === 'Buyer' ? '#06b6d4' : '#ec4899' }} />
          </div>
        </div>
        
        <motion.div
          className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} rounded-b-2xl`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ transformOrigin: 'left' }}
        />
      </motion.div>
    </motion.div>
  );
}
