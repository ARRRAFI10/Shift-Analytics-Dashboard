import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReasonBreakdown } from "../types";
import { Card } from "./ui/Card";
import { Empty } from "./ui/States";

interface ReasonBreakdownChartProps {
  breakdown: ReasonBreakdown;
}

export function ReasonBreakdownChart({ breakdown }: ReasonBreakdownChartProps) {
  const { dimension, results } = breakdown;
  // Height grows with the number of bars so labels never crowd each other.
  const height = Math.max(220, results.length * 38 + 40);

  return (
    <Card
      title="Hours by Reason"
      subtitle={`Total hours per ${dimension} (toggle the dimension in the filter bar)`}
    >
      {results.length === 0 ? (
        <Empty />
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={results}
              margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="key"
                width={130}
                tick={{ fontSize: 12, fill: "#475569" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                formatter={(value: number, _name, item) => [
                  `${value}h · ${item.payload.record_count} records`,
                  item.payload.key,
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="total_hours" radius={[0, 4, 4, 0]}>
                {results.map((item) => (
                  <Cell key={item.key} fill={item.color} />
                ))}
                <LabelList
                  dataKey="total_hours"
                  position="right"
                  formatter={(v: number) => `${v}h`}
                  style={{ fontSize: 11, fill: "#64748b" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
