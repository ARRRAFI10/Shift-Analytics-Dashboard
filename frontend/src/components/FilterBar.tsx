import { useMemo } from "react";
import type { Category, Dimension, Filters } from "../types";

interface FilterBarProps {
  filters: Filters;
  categories: Category[];
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

const inputClass =
  "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 " +
  "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

const labelClass = "text-xs font-medium uppercase tracking-wide text-slate-500";

export function FilterBar({ filters, categories, onChange, onReset }: FilterBarProps) {
  const groups = useMemo(
    () => [...new Set(categories.map((c) => c.group).filter(Boolean))].sort(),
    [categories]
  );

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const toggleReason = (name: string) => {
    const next = filters.reasons.includes(name)
      ? filters.reasons.filter((r) => r !== name)
      : [...filters.reasons, name];
    set("reasons", next);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>From</label>
          <input
            type="date"
            className={inputClass}
            value={filters.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>To</label>
          <input
            type="date"
            className={inputClass}
            value={filters.dateTo}
            onChange={(e) => set("dateTo", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Group</label>
          <select
            className={inputClass}
            value={filters.group}
            onChange={(e) => set("group", e.target.value)}
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Productivity</label>
          <select
            className={inputClass}
            value={filters.productive}
            onChange={(e) => set("productive", e.target.value as Filters["productive"])}
          >
            <option value="">All</option>
            <option value="true">Productive only</option>
            <option value="false">Non-productive only</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Min duration (h)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            className={`${inputClass} w-28`}
            value={filters.minDuration}
            onChange={(e) => set("minDuration", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Breakdown dimension</label>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
            {(["reason", "group"] as Dimension[]).map((dim) => (
              <button
                key={dim}
                type="button"
                onClick={() => set("dimension", dim)}
                className={`px-3 py-1.5 text-sm capitalize transition ${
                  filters.dimension === dim
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {dim}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Reset filters
        </button>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <label className={labelClass}>Reasons</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = filters.reasons.includes(c.name);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleReason(c.name)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-transparent text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                style={active ? { backgroundColor: c.color } : undefined}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: active ? "#ffffff" : c.color }}
                />
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
