import { MonthlySalesProps } from "../utils/types";
import Chart from "../sub-components/Chart";
import { YearSelector } from "../sub-components/YearSelector";
import { MonthlySalesHeaderSkeleton } from "../sub-components/Skeletons";

export default function MonthlySales({
  selectedYear,
  years,
  onYearChange,
  isLoading = false,
  chartData,
}: MonthlySalesProps) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#050505] border-2 border-neutral-800 dark:border-white transition-colors duration-300">
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar-if-needed p-6 lg:p-10 flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 lg:mb-12 flex-shrink-0">
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <MonthlySalesHeaderSkeleton />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-[2px] bg-red-500"></div>
                  <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
                    Performance
                  </span>
                </div>
                <h2 className="font-syne text-3xl lg:text-5xl font-black uppercase tracking-widest text-neutral-800 dark:text-white leading-none">
                  Monthly Sales
                </h2>
                <p className="font-space text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  Values represent monthly revenue in USD.
                </p>
              </>
            )}
          </div>
          <YearSelector
            selectedYear={selectedYear}
            years={years}
            onYearChange={onYearChange}
            isLoading={isLoading}
          />
        </div>

        <div className="flex-1 min-h-[250px] border-t border-neutral-800/10 dark:border-white/10 pt-8 mt-2 relative">
          <Chart chartData={chartData} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
