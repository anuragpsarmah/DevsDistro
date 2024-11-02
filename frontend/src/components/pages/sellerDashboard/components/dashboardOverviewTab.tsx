import { useRef, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCommonSalesInformationQuery,
  useYearlySalesInformationQuery,
} from "@/hooks/apiQueries";
import Chart from "./chart";

interface chartDataObject {
  month: string;
  sales: number;
}

interface commonSalesInformationData {
  active_projects: number;
  best_seller: string;
  customer_rating: number;
  total_sales: number;
}

export default function DashboardOverviewTab() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState<number>(400);
  const [chartData, setChartData] = useState<Array<chartDataObject>>([
    { month: "January", sales: 0 },
    { month: "February", sales: 0 },
    { month: "March", sales: 0 },
    { month: "April", sales: 0 },
    { month: "May", sales: 0 },
    { month: "June", sales: 0 },
    { month: "July", sales: 0 },
    { month: "August", sales: 0 },
    { month: "September", sales: 0 },
    { month: "October", sales: 0 },
    { month: "November", sales: 0 },
    { month: "December", sales: 0 },
  ]);

  const currentYear = new Date().getFullYear();
  const startYear = 2024;
  const years = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => startYear + i
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    currentYear.toString()
  );
  const [commonSalesInformation, setCommonSalesInformation] =
    useState<commonSalesInformationData>({
      active_projects: 0,
      best_seller: "",
      customer_rating: 0,
      total_sales: 0,
    });

  const { data: commonInformationData } = useCommonSalesInformationQuery();
  const { data: yearlySalesInformationData } = useYearlySalesInformationQuery(
    parseInt(selectedYear)
  );

  useEffect(() => {
    if (chartContainerRef.current) {
      const chartHeight = chartContainerRef.current.offsetHeight;
      setChartHeight(chartHeight + 24);
    }
  }, []);

  useEffect(() => {
    if (commonInformationData) {
      setCommonSalesInformation({
        active_projects: commonInformationData.data.active_projects,
        best_seller: commonInformationData.data.best_seller,
        customer_rating: commonInformationData.data.customer_rating,
        total_sales: commonInformationData.data.total_sales,
      });
    }
  }, [commonInformationData]);

  useEffect(() => {
    if (yearlySalesInformationData) {
      const updatedChartData = chartData.map((item, index) => {
        if (index < yearlySalesInformationData.data.monthly_sales.length) {
          return {
            ...item,
            sales: yearlySalesInformationData.data.monthly_sales[index].sales,
          };
        }
        return item;
      });
      setChartData(updatedChartData);
    }
  }, [yearlySalesInformationData]);

  return (
    <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
      <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
        Dashboard Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Sales"
          value={"₹" + commonSalesInformation.total_sales.toString()}
        />
        <DashboardCard
          title="Active Projects"
          value={commonSalesInformation.active_projects.toString()}
        />
        <DashboardCard
          title="Best Seller"
          value={commonSalesInformation.best_seller.toString() || "None"}
        />
        <DashboardCard
          title="Customer Rating"
          value={
            commonSalesInformation.customer_rating
              ? commonSalesInformation.customer_rating.toString() + "/5"
              : "No reviews"
          }
        />
      </div>

      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-semibold text-gray-300">
            Monthly Sales
          </h2>
          <Select
            value={selectedYear}
            onValueChange={(value) => setSelectedYear(value)}
          >
            <SelectTrigger className="w-[100px] bg-gray-700 text-gray-300 border-gray-600">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 text-gray-300 border-gray-600">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full" style={{ height: `${chartHeight}px` }}>
          <div ref={chartContainerRef}>
            <Chart chartData={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        {value}
      </p>
    </div>
  );
}
