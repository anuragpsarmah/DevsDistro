import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useCommonSalesInformationQuery,
  useYearlySalesInformationQuery,
} from "@/hooks/apiQueries";
import Chart from "../components/Chart";
import { YearSelector } from "../components/YearSelector";
import { SalesMetrics } from "../components/SalesMetrics";
import { useChartDimensions } from "../hooks/useChartDimensions";
import { useYearOptions } from "../hooks/useYearOptions";
import { INITIAL_CHART_DATA, INITIAL_SALES_INFO } from "../utils/constants";
import type { ChartDataObject, CommonSalesInformation } from "../utils/types";
import AnimatedLoadWrapper from "@/pages/sellerDashboard/components/AnimatedLoadWrapper";

interface DashboardOverviewTabProps {
  logout?: () => Promise<void>;
}

export default function DashboardOverviewTab({
  logout,
}: DashboardOverviewTabProps) {
  const [chartData, setChartData] =
    useState<ChartDataObject[]>(INITIAL_CHART_DATA);
  const [salesInfo, setSalesInfo] =
    useState<CommonSalesInformation>(INITIAL_SALES_INFO);
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
    if (!commonInfoLoading && !commonInfoError && commonInfoData?.data) {
      setSalesInfo(commonInfoData.data);
    } else if (!commonInfoLoading && commonInfoError) {
      console.log("Something went wrong");
    }
  }, [commonInfoData, commonInfoLoading, commonInfoError, toast]);

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
    } else if (!yearlyLoading && yearlyError) {
      console.log("Something went wrong");
    }
  }, [yearlyData, yearlyLoading, yearlyError, toast]);

  return (
    <AnimatedLoadWrapper>
      <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
        <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
          Dashboard Overview
        </h1>

        <SalesMetrics salesInfo={salesInfo} isLoading={commonInfoLoading} />

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-semibold text-gray-300">
              Monthly Sales
            </h2>
            <YearSelector
              selectedYear={selectedYear}
              years={years}
              onYearChange={setSelectedYear}
              isLoading={yearlyLoading}
            />
          </div>
          <div className="w-full" style={{ height: `${chartHeight}px` }}>
            <div ref={chartContainerRef}>
              <Chart chartData={chartData} isLoading={yearlyLoading} />
            </div>
          </div>
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
