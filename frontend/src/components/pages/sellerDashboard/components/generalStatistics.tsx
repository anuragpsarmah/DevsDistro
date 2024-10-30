import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useRef, useEffect, useState } from "react";

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
  { month: "July", desktop: 214 },
  { month: "August", desktop: 214 },
  { month: "September", desktop: 214 },
  { month: "October", desktop: 214 },
  { month: "November", desktop: 214 },
  { month: "December", desktop: 214 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function GeneralStatistics() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState<number>(400);

  useEffect(() => {
    if (chartContainerRef.current) {
      const chartHeight = chartContainerRef.current.offsetHeight;
      setChartHeight(chartHeight + 24);
    }
  }, []);

  return (
    <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
      <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
        Seller Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard title="Total Sales" value="$12,345" />
        <DashboardCard title="Active Projects" value="7" />
        <DashboardCard title="Best Seller" value="Silhouette" />
        <DashboardCard title="Customer Rating" value="4.8/5" />
      </div>

      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-semibold mb-10 text-gray-300">
          Monthly Sales
        </h2>
        <div className="w-full" style={{ height: `${chartHeight}px` }}>
          <div ref={chartContainerRef}>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ right: 60, left: 30 }}>
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(255, 255, 255, 0.1)"
                  />
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
                  <Bar
                    dataKey="desktop"
                    fill="var(--color-desktop)"
                    radius={4}
                  />
                  <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
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
