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
    <div className="relative h-full">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-2xl rounded-3xl pointer-events-none" />
      <div className="relative h-full bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg p-4 lg:p-5 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />
        
        <div className="relative z-10">
          <h3 className="text-xs lg:text-sm font-medium text-gray-400 mb-1.5 uppercase tracking-wide">{title}</h3>
          <p className="text-xl lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};
