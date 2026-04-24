import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartProps } from "../utils/types";
import { ChartSkeleton } from "./Skeletons";

const chartConfig = {
  sales: {
    label: "Revenue (USD)",
    color: "#ef4444",
  },
} satisfies ChartConfig;

export default function Chart({ chartData, isLoading = false }: ChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="h-full w-full [aspect-ratio:unset]"
    >
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          vertical={false}
          stroke="currentColor"
          className="opacity-10 dark:opacity-20"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={12}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3).toUpperCase()}
          tick={{
            fill: "currentColor",
            className: "opacity-50 font-space text-[10px] tracking-widest",
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          tick={{
            fill: "currentColor",
            className: "opacity-50 font-space text-[10px] tracking-widest",
          }}
          width={60}
        />
        <ChartTooltip
          cursor={{ fill: "rgba(239, 68, 68, 0.1)" }}
          content={
            <ChartTooltipContent
              className="w-32 rounded-none border-2 border-neutral-800 dark:border-white bg-white dark:bg-[#050505] text-neutral-800 dark:text-white font-space uppercase text-[10px] tracking-widest p-3"
              indicator="line"
            />
          }
        />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={0} />
      </BarChart>
    </ChartContainer>
  );
}
