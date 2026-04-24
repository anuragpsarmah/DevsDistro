import { DashboardCardSkeleton } from "./Skeletons";
import { DashboardCardProps } from "../utils/types";

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  isLoading = false,
}) => {
  if (isLoading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <div className="relative h-full bg-white dark:bg-[#050505] border-2 border-neutral-800 dark:border-white p-6 lg:p-8 flex flex-col justify-between overflow-hidden transition-colors duration-300 group hover:border-red-500 dark:hover:border-red-500">
      <div className="relative z-10 flex flex-col gap-6">
        <h3 className="font-space font-bold uppercase tracking-[0.2em] text-[10px] text-gray-500 group-hover:text-red-500 transition-colors duration-300">
          {title}
        </h3>
        <p className="font-syne text-4xl lg:text-5xl font-black uppercase tracking-widest leading-none text-neutral-800 dark:text-white transition-colors duration-300 truncate">
          {value}
        </p>
      </div>
    </div>
  );
};
