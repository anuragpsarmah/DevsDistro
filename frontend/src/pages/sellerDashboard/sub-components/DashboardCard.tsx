import { DashboardCardSkeleton } from "./Skeletons";
import { DashboardCardProps } from "../utils/types";
import { MagicCard } from "@/components/ui/magic-card";

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  isLoading = false,
}) => {
  if (isLoading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <MagicCard
      className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg transition-all duration-300 ease-in-out"
      gradientSize={300}
      gradientColor="#3B82F6"
      gradientOpacity={0.2}
    >
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        {value}
      </p>
    </MagicCard>
  );
};
