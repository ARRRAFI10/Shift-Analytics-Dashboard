import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ReasonBreakdown } from "../types";
import { Card } from "./ui/Card";
import { Empty } from "./ui/States";

interface ReasonPieChartProps {
  breakdown: ReasonBreakdown;
}

// Only label slices big enough to read, so a long tail of small reasons doesn't
// crowd the chart.
const sliceLabel = ({ percent }: { percent?: number }) =>
  percent && percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : "";

export function ReasonPieChart({ breakdown }: ReasonPieChartProps) {
  const { dimension, results } = breakdown;
  const total = results.reduce((sum, r) => sum + r.total_hours, 0);

  return (
    <Card title="Reason Distribution" subtitle={`Share of total hours per ${dimension}`}>
      {results.length === 0 || total === 0 ? (
        <Empty />
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={results}
                dataKey="total_hours"
                nameKey="key"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={1}
                label={sliceLabel}
                labelLine={false}
                isAnimationActive={false}
              >
                {results.map((item) => (
                  <Cell key={item.key} fill={item.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value}h · ${((value / total) * 100).toFixed(1)}%`,
                  name,
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => <span className="text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
