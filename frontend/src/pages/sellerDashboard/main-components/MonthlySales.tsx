import { MonthlySalesProps } from "../utils/types";
import Chart from "../sub-components/Chart";
import { YearSelector } from "../sub-components/YearSelector";

export default function MonthlySales({
  selectedYear,
  years,
  onYearChange,
  isLoading = false,
  chartData,
  chartContainerRef,
  chartHeight,
}: MonthlySalesProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-semibold text-gray-300">Monthly Sales</h2>
        <YearSelector
          selectedYear={selectedYear}
          years={years}
          onYearChange={onYearChange}
          isLoading={isLoading}
        />
      </div>
      <div className="w-full" style={{ height: `${chartHeight}px` }}>
        <div ref={chartContainerRef}>
          <Chart chartData={chartData} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}
