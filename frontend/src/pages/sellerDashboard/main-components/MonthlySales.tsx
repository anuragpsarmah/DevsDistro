import { MonthlySalesProps } from "../utils/types";
import Chart from "../sub-components/Chart";
import { YearSelector } from "../sub-components/YearSelector";
import { BarChart3 } from "lucide-react";

export default function MonthlySales({
  selectedYear,
  years,
  onYearChange,
  isLoading = false,
  chartData,
}: MonthlySalesProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3 lg:mb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-semibold text-white">Monthly Sales</h2>
            <p className="text-xs text-gray-500 hidden sm:block">Revenue trends for the selected year</p>
          </div>
        </div>
        <YearSelector
          selectedYear={selectedYear}
          years={years}
          onYearChange={onYearChange}
          isLoading={isLoading}
        />
      </div>
      
      <div className="flex-1 min-h-0">
        <Chart chartData={chartData} isLoading={isLoading} />
      </div>
    </div>
  );
}
