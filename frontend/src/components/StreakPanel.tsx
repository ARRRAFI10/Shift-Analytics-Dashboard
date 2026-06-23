import type { Streak } from "../types";
import { Card } from "./ui/Card";
import { Empty } from "./ui/States";

interface StreakPanelProps {
  streaks: Streak[];
}

export function StreakPanel({ streaks }: StreakPanelProps) {
  return (
    <Card
      title="Breakdown Streaks"
      subtitle="Consecutive days with a breakdown, ranked by downtime"
    >
      {streaks.length === 0 ? (
        <Empty message="No qualifying streaks for the current filters." />
      ) : (
        <ul className="space-y-3">
          {streaks.map((streak, idx) => (
            <li
              key={`${streak.start_date}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {streak.start_date} → {streak.end_date}
                </p>
                <p className="text-xs text-slate-500">
                  {streak.category} · {streak.length_days} consecutive days
                </p>
              </div>
              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                {streak.total_hours}h
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
