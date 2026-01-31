import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useCommonSalesInformationQuery,
  useYearlySalesInformationQuery,
} from "@/hooks/apiQueries";
import { useYearOptions } from "../hooks/useYearOptions";
import { INITIAL_CHART_DATA, INITIAL_SALES_INFO } from "../utils/constants";
import type { ChartDataObject } from "../utils/types";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import { SalesMetrics } from "../main-components/SalesMetrics";
import MonthlySales from "../main-components/MonthlySales";
import { TrendingUp } from "lucide-react";

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
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6">
        <div className="flex-shrink-0 mb-4 lg:mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl text-left font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Dashboard Overview
              </h1>
              <p className="text-xs lg:text-sm text-gray-500">Track your sales performance and metrics</p>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 mb-4 lg:mb-5">
          <SalesMetrics
            salesInfo={
              !commonInfoLoading && !commonInfoError && commonInfoData
                ? commonInfoData.data
                : INITIAL_SALES_INFO
            }
            isLoading={commonInfoLoading}
          />
        </div>

        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-2xl rounded-3xl pointer-events-none" />
          <div className="relative h-full bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />
            <div className="relative z-10 h-full p-4 lg:p-5 flex flex-col">
              <MonthlySales
                selectedYear={selectedYear}
                years={years}
                onYearChange={setSelectedYear}
                isLoading={yearlyLoading}
                chartData={chartData}
              />
            </div>
          </div>
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
