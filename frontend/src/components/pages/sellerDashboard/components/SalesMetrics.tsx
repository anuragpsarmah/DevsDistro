import { DashboardCard } from "./DashboardCard";
import { SalesMetricsSkeleton } from "./Skeletons";
import { CommonSalesInformation } from "../utils/types";

interface SalesMetricsProps {
  salesInfo: CommonSalesInformation;
  isLoading?: boolean;
}

export const SalesMetrics: React.FC<SalesMetricsProps> = ({
  salesInfo,
  isLoading = false,
}) => {
  if (isLoading) {
    return <SalesMetricsSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <DashboardCard title="Total Sales" value={`₹${salesInfo.total_sales}`} />
      <DashboardCard
        title="Active Projects"
        value={salesInfo.active_projects.toString()}
      />
      <DashboardCard
        title="Best Seller"
        value={salesInfo.best_seller || "None"}
      />
      <DashboardCard
        title="Customer Rating"
        value={
          salesInfo.customer_rating
            ? `${salesInfo.customer_rating}/5`
            : "No reviews"
        }
      />
    </div>
  );
};
