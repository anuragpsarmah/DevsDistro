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
    return <Skeleton className="h-10 w-[100px] bg-gray-700" />;
  }

  return (
    <Select value={selectedYear} onValueChange={onYearChange}>
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
  );
};
