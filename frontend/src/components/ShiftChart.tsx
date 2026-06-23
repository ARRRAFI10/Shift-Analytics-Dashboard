import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category, ChartShift } from "../types";
import { Card } from "./ui/Card";
import { Empty } from "./ui/States";

interface ShiftChartProps {
  shifts: ChartShift[];
  categories: Category[];
}

function formatHour(value: number): string {
  const total = Math.round(value * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Each date occupies a band; shifts on that date are spread across "slots" so
// overlapping ones sit side by side instead of on top of each other. A shift is
// drawn as a transparent offset (0 → start) plus a coloured segment (= duration).
function buildRows(shifts: ChartShift[]) {
  const byDate = new Map<string, ChartShift[]>();
  for (const shift of shifts) {
    const list = byDate.get(shift.date) ?? [];
    list.push(shift);
    byDate.set(shift.date, list);
  }

  const slotCount = Math.max(1, ...[...byDate.values()].map((s) => s.length));

  const rows = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daily]) => {
      const ordered = [...daily].sort((a, b) => a.start_hour - b.start_hour);
      const row: Record<string, number | string | null> = { date };
      for (let i = 0; i < slotCount; i += 1) {
        const shift = ordered[i];
        row[`offset${i}`] = shift ? shift.start_hour : null;
        row[`dur${i}`] = shift ? shift.duration_hours : null;
        row[`color${i}`] = shift ? shift.color : null;
      }
      return row;
    });

  return { rows, slotCount, byDate };
}

export function ShiftChart({ shifts, categories }: ShiftChartProps) {
  const { rows, slotCount, byDate, domain } = useMemo(() => {
    const built = buildRows(shifts);
    if (!shifts.length) {
      return { ...built, domain: [0, 24] as [number, number] };
    }
    const starts = shifts.map((s) => s.start_hour);
    const ends = shifts.map((s) => s.end_hour);
    // Range follows the data and only crosses 24h when a shift truly does.
    const min = Math.max(0, Math.floor(Math.min(...starts)) - 1);
    const max = Math.ceil(Math.max(...ends)) + 1;
    return { ...built, domain: [min, max] as [number, number] };
  }, [shifts]);

  const legend = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  return (
    <Card
      title="Shift Timeline"
      subtitle="Each bar spans a shift from start to end (UTC). Overlapping shifts on a day sit side by side."
    >
      {shifts.length === 0 ? (
        <Empty message="No shifts match the current filters." />
      ) : (
        <>
          <div className="h-[460px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 10, right: 16, bottom: 40, left: 8 }}
                barGap={1}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis
                  domain={domain}
                  tickFormatter={formatHour}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  label={{
                    value: "Time of day (UTC)",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12, fill: "#64748b" },
                  }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                  content={<ShiftTooltip byDate={byDate} />}
                />
                {Array.from({ length: slotCount }).flatMap((_, i) => [
                  <Bar
                    key={`offset${i}`}
                    dataKey={`offset${i}`}
                    stackId={`slot${i}`}
                    fill="transparent"
                    isAnimationActive={false}
                  />,
                  <Bar
                    key={`dur${i}`}
                    dataKey={`dur${i}`}
                    stackId={`slot${i}`}
                    isAnimationActive={false}
                    radius={[2, 2, 0, 0]}
                  >
                    {rows.map((row, idx) => (
                      <Cell
                        key={idx}
                        fill={(row[`color${i}`] as string) ?? "transparent"}
                      />
                    ))}
                  </Bar>,
                ])}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4">
            {legend.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string;
  byDate: Map<string, ChartShift[]>;
}

function ShiftTooltip({ active, label, byDate }: TooltipProps) {
  if (!active || !label) return null;
  const daily = byDate.get(label);
  if (!daily?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md">
      <p className="mb-2 text-sm font-semibold text-slate-800">{label}</p>
      <ul className="space-y-1">
        {[...daily]
          .sort((a, b) => a.start_hour - b.start_hour)
          .map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs text-slate-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-medium text-slate-700">{s.reason}</span>
              <span className="text-slate-400">
                {s.start_time}–{s.end_time} · {s.duration_hours.toFixed(1)}h
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
