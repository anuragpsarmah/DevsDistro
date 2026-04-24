import { useState, useEffect } from "react";
import {
  useCommonSalesInformationQuery,
  useYearlySalesInformationQuery,
} from "@/hooks/apiQueries";
import { useYearOptions } from "../hooks/useYearOptions";
import { INITIAL_CHART_DATA, INITIAL_SALES_INFO } from "../utils/constants";
import type { ChartDataObject } from "../utils/types";
import { mergeChartData } from "../utils/chartUtils";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import { SalesMetrics } from "../main-components/SalesMetrics";
import MonthlySales from "../main-components/MonthlySales";
import { ErrorScreenDashboardSection } from "../sub-components/ErrorScreens";
import { DashboardOverviewTabProps } from "@/utils/types";

export default function DashboardOverviewTab({
  logout,
}: DashboardOverviewTabProps) {
  const [chartData, setChartData] =
    useState<ChartDataObject[]>(INITIAL_CHART_DATA);
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );

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
        mergeChartData(prevData, yearlyData.data.monthly_sales)
      );
    }
  }, [yearlyData, yearlyLoading, yearlyError]);

  return (
    <AnimatedLoadWrapper>
      <div className="flex flex-col min-h-[calc(100vh-3rem)] lg:h-[calc(100vh-56px)] mt-10 lg:mt-0 pb-6">
        <div className="flex-shrink-0 mb-8 lg:mb-10 w-full">
          <div className="flex items-center gap-3 mb-6 w-full">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              Overview
            </span>
          </div>
          <div className="text-left w-full max-w-4xl">
            <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-neutral-800 dark:text-white leading-none break-words hyphens-auto transition-colors duration-300">
              Dashboard
            </h1>
            <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
              Track your sales performance and metrics in real-time.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 w-full mb-8 lg:mb-10">
          {commonInfoError && !commonInfoLoading ? (
            <ErrorScreenDashboardSection
              title="Overview Metrics Unavailable"
              errorCode="[Error: Failed to Load Overview Metrics]"
              description="We couldn't fetch your dashboard metrics right now. Please check your network connection and reload the page."
            />
          ) : (
            <SalesMetrics
              salesInfo={
                !commonInfoLoading && commonInfoData
                  ? commonInfoData.data
                  : INITIAL_SALES_INFO
              }
              isLoading={commonInfoLoading}
            />
          )}
        </div>

        <div className="flex-1 min-h-0 w-full">
          {yearlyError && !yearlyLoading ? (
            <ErrorScreenDashboardSection
              title="Monthly Sales Unavailable"
              errorCode="[Error: Failed to Load Monthly Sales]"
              description="We couldn't fetch your yearly sales timeline for the selected year. Please reload the page or switch tabs and return."
            />
          ) : (
            <MonthlySales
              selectedYear={selectedYear}
              years={years}
              onYearChange={setSelectedYear}
              isLoading={yearlyLoading}
              chartData={chartData}
            />
          )}
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
