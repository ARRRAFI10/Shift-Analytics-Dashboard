import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Efficiency } from "../types";
import { Card } from "./ui/Card";
import { Empty } from "./ui/States";

interface EfficiencyCardProps {
  efficiency: Efficiency;
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

export function EfficiencyCard({ efficiency }: EfficiencyCardProps) {
  const { overall, per_day } = efficiency;

  return (
    <Card
      title="Operational Efficiency"
      subtitle="Productive hours as a share of total hours"
    >
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <div>
          <p className={`text-4xl font-bold ${scoreColor(overall.score)}`}>
            {overall.score}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            across {overall.record_count} records
          </p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-slate-500">Productive</dt>
            <dd className="font-semibold text-slate-800">
              {overall.productive_hours}h
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Non-productive</dt>
            <dd className="font-semibold text-slate-800">
              {overall.non_productive_hours}h
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Total</dt>
            <dd className="font-semibold text-slate-800">{overall.total_hours}h</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 h-56 w-full">
        {per_day.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={per_day} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748b" }}
                angle={-45}
                textAnchor="end"
                height={56}
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, "Efficiency"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
