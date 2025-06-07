import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useCommonSalesInformationQuery,
  useYearlySalesInformationQuery,
} from "@/hooks/apiQueries";
import { useChartDimensions } from "../hooks/useChartDimensions";
import { useYearOptions } from "../hooks/useYearOptions";
import { INITIAL_CHART_DATA, INITIAL_SALES_INFO } from "../utils/constants";
import type { ChartDataObject } from "../utils/types";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import { SalesMetrics } from "../main-components/SalesMetrics";
import { MagicCard } from "@/components/ui/magic-card";
import MonthlySales from "../main-components/MonthlySales";

interface DashboardOverviewTabProps {
  logout?: () => Promise<void>;
}

export default function DashboardOverviewTab({
  logout,
}: DashboardOverviewTabProps) {
  const [chartData, setChartData] =
    useState<ChartDataObject[]>(INITIAL_CHART_DATA);
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );

  const { toast } = useToast();
  const years = useYearOptions();
  const { chartContainerRef, chartHeight } = useChartDimensions();

  const {
    data: commonInfoData,
    isLoading: commonInfoLoading,
    isError: commonInfoError,
  } = useCommonSalesInformationQuery({ logout });

  const {
    data: yearlyData,
    isLoading: yearlyLoading,
    isError: yearlyError,
  } = useYearlySalesInformationQuery(parseInt(selectedYear), { logout });

  useEffect(() => {
    if (!yearlyLoading && !yearlyError && yearlyData?.data) {
      setChartData((prevData) =>
        prevData.map((item, index) => ({
          ...item,
          sales:
            index < yearlyData.data.monthly_sales.length
              ? yearlyData.data.monthly_sales[index].sales
              : item.sales,
        }))
      );
    }
  }, [yearlyData, yearlyLoading, yearlyError, toast]);

  return (
    <AnimatedLoadWrapper>
      <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
        <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
          Dashboard Overview
        </h1>

        <SalesMetrics
          salesInfo={
            !commonInfoLoading && !commonInfoError && commonInfoData
              ? commonInfoData.data
              : INITIAL_SALES_INFO
          }
          isLoading={commonInfoLoading}
        />

        <MagicCard
          className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg transition-all duration-300 ease-in-out"
          gradientSize={300}
          gradientColor="#3B82F6"
          gradientOpacity={0.2}
        >
          <MonthlySales
            selectedYear={selectedYear}
            years={years}
            onYearChange={setSelectedYear}
            isLoading={yearlyLoading}
            chartData={chartData}
            chartContainerRef={chartContainerRef}
            chartHeight={chartHeight}
          />
        </MagicCard>
      </div>
    </AnimatedLoadWrapper>
  );
}
