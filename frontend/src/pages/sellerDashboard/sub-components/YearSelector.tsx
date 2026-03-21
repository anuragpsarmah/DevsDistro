import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { YearSelectorProps } from "../utils/types";

export const YearSelector: React.FC<YearSelectorProps> = ({
  selectedYear,
  years,
  onYearChange,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Skeleton className="h-12 w-[120px] rounded-none bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10" />
    );
  }

  return (
    <Select value={selectedYear} onValueChange={onYearChange}>
      <SelectTrigger className="h-12 w-[120px] rounded-none bg-transparent border-2 border-black dark:border-white text-black dark:text-white font-space font-bold uppercase tracking-widest text-[10px] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-300 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
        <SelectValue placeholder="YEAR" />
      </SelectTrigger>
      <SelectContent className="rounded-none bg-white dark:bg-[#050505] border-2 border-black dark:border-white text-black dark:text-white font-space tracking-widest uppercase text-[10px]">
        {years.map((year) => (
          <SelectItem
            key={year}
            value={year.toString()}
            className="rounded-none focus:bg-red-500 focus:text-white hover:bg-red-500 hover:text-white cursor-pointer transition-colors duration-200"
          >
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
