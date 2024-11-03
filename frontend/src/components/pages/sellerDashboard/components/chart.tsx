import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartSkeleton } from "./Skeletons";

interface chartDataObject {
  month: string;
  sales: number;
}

interface ChartProps {
  chartData: Array<chartDataObject>;
  isLoading?: boolean;
}

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
    <ChartContainer config={chartConfig}>
      <BarChart data={chartData} margin={{ right: 60, left: 30 }}>
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
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
          stroke="rgba(255, 255, 255, 0.5)"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          stroke="rgba(255, 255, 255, 0.5)"
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
