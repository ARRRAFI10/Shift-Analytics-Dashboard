import type { Efficiency, Streak } from "../types";

interface KpiStripProps {
  efficiency: Efficiency;
  streaks: Streak[];
}

// Mirrors the thresholds used in EfficiencyCard so the headline number reads the
// same way wherever it appears.
function efficiencyColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}

function KpiCard({ label, value, hint, valueClass = "text-slate-900" }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// Headline KPIs for the current filtered view. Everything is derived from data the
// dashboard already fetches, so the strip reacts to filters with no extra request.
// "Downtime" uses non-productive hours rather than a hardcoded "Breakdown" reason,
// so it stays correct as categories and their classifications change.
export function KpiStrip({ efficiency, streaks }: KpiStripProps) {
  const { overall } = efficiency;
  const longest = streaks.reduce((max, s) => Math.max(max, s.length_days), 0);
  const longestStreak = streaks.find((s) => s.length_days === longest);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label="Efficiency Score"
        value={`${overall.score}%`}
        hint={`across ${overall.record_count} records`}
        valueClass={efficiencyColor(overall.score)}
      />
      <KpiCard
        label="Total Hours"
        value={`${overall.total_hours}h`}
        hint={`${overall.productive_hours}h productive`}
      />
      <KpiCard
        label="Downtime Hours"
        value={`${overall.non_productive_hours}h`}
        hint="non-productive time"
      />
      <KpiCard
        label="Longest Breakdown Streak"
        value={longest ? `${longest} days` : "—"}
        hint={
          longestStreak
            ? `${longestStreak.start_date} → ${longestStreak.end_date}`
            : "no qualifying streak"
        }
      />
    </div>
  );
}
