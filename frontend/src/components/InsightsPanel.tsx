import type { Insight } from "../types";
import { Card } from "./ui/Card";
import { Empty } from "./ui/States";

interface InsightsPanelProps {
  insights: Insight[];
}

const accent: Record<string, string> = {
  top_downtime_reason: "border-l-amber-500",
  worst_day: "border-l-red-500",
  worst_streak: "border-l-purple-500",
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <Card title="Insights" subtitle="Automatically derived from the current view">
      {insights.length === 0 ? (
        <Empty message="No insights for the current filters." />
      ) : (
        <div className="grid gap-3">
          {insights.map((insight) => (
            <div
              key={insight.type}
              className={`rounded-lg border border-slate-200 border-l-4 bg-white p-4 ${
                accent[insight.type] ?? "border-l-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  {insight.title}
                </h3>
                <span className="text-sm font-bold text-slate-700">
                  {insight.metric}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{insight.message}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
