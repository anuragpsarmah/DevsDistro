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
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        {value}
      </p>
    </div>
  );
};
