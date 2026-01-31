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
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function Chart({ chartData, isLoading = false }: ChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full [aspect-ratio:unset]">
      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={8}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
          stroke="rgba(255, 255, 255, 0.5)"
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          stroke="rgba(255, 255, 255, 0.5)"
          fontSize={11}
          width={45}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dashed" />}
        />
        <Bar dataKey="sales" fill="url(#salesGradient)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
