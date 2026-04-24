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
}: ProfileCardProps) {
  return (
    <div
      className="relative group h-full flex flex-col cursor-pointer bg-white dark:bg-[#050505] border-2 border-neutral-800/20 dark:border-white/20 hover:border-neutral-800 dark:hover:border-white transition-colors duration-300 p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(38,38,38,0)] hover:shadow-[8px_8px_0px_0px_rgba(38,38,38,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]"
      onMouseEnter={setHovered}
      onMouseLeave={setNotHovered}
      onClick={onClick}
    >
      <div
        className={`absolute top-0 right-0 w-8 h-8 md:w-12 md:h-12 border-t-4 border-r-4 transition-colors duration-300 ${isHovered ? "border-red-500" : "border-neutral-800/20 dark:border-white/20"}`}
      ></div>

      <div className="flex flex-col h-full z-10 relative">
        <div
          className={`w-16 h-16 mb-8 flex items-center justify-center transition-colors duration-300 ${isHovered ? "text-red-500" : "text-neutral-800 dark:text-white"}`}
        >
          {icon}
        </div>

        <h2 className="text-3xl md:text-5xl font-syne font-black uppercase tracking-widest text-neutral-800 dark:text-white mb-6">
          {title}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-space uppercase mb-12 flex-grow border-l-2 border-red-500 pl-4">
          {description}
        </p>

        <ul className="flex flex-col gap-4 mb-12">
          {features.map((feature, index) => (
            <li key={index} className="flex gap-4 items-start">
              <span className="text-red-500 font-bold opacity-50 font-space uppercase text-xs tracking-widest leading-relaxed">
                /
              </span>
              <span className="font-space uppercase tracking-[0.1em] text-xs md:text-sm font-bold text-gray-800 dark:text-gray-200">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8 border-t-2 border-neutral-800/20 dark:border-white/20 flex items-center justify-between">
          <button
            className={`relative overflow-hidden px-8 py-4 font-space font-bold uppercase tracking-widest text-[10px] md:text-sm border-2 border-neutral-800 dark:border-white transition-colors duration-300 w-full flex items-center justify-center gap-4 ${isHovered ? "bg-red-500 border-red-500 text-white" : "bg-transparent text-neutral-800 dark:text-white"}`}
          >
            <span>EXECUTE {title}</span>
            <ArrowRight
              size={18}
              className={`transition-transform duration-300 ${isHovered ? "translate-x-2" : ""}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
