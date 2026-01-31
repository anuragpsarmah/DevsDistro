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
    return <Skeleton className="h-10 w-[100px] bg-white/5 rounded-md" />;
  }

  return (
    <Select value={selectedYear} onValueChange={onYearChange}>
      <SelectTrigger className="w-[100px] bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-colors duration-200 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-indigo-500/50">
        <SelectValue placeholder="Year" />
      </SelectTrigger>
      <SelectContent className="bg-[#14152b]/90 border-white/10 text-white backdrop-blur-xl">
        {years.map((year) => (
          <SelectItem 
            key={year} 
            value={year.toString()}
            className="focus:bg-white/10 hover:bg-white/10 cursor-pointer text-gray-300 focus:text-white"
          >
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
