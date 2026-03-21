import { DashboardCard } from "../sub-components/DashboardCard";
import { SalesMetricsSkeleton } from "../sub-components/Skeletons";
import { SalesMetricsProps } from "../utils/types";

export const SalesMetrics: React.FC<SalesMetricsProps> = ({
  salesInfo,
  isLoading = false,
}) => {
  if (isLoading) {
    return <SalesMetricsSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
      <DashboardCard
        title="TOTAL SALES"
        value={`$${Number(salesInfo.total_sales).toFixed(2)}`}
      />
      <DashboardCard
        title="ACTIVE PROJECTS"
        value={salesInfo.active_projects.toString()}
      />
      <DashboardCard
        title="BEST SELLER"
        value={salesInfo.best_seller || "NONE"}
      />
      <DashboardCard
        title="AVG RATING"
        value={
          salesInfo.customer_rating ? `${salesInfo.customer_rating}/5` : "NONE"
        }
      />
    </div>
  );
};
