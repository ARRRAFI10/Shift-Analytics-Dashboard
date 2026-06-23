import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Dataset } from "../types";
import { Card } from "./ui/Card";
import { Empty, ErrorState, Loading } from "./ui/States";

interface DatasetPanelProps {
  selectedDatasetId: number | null;
  onSelect: (id: number | null) => void;
  refreshKey?: number;
}

const sourceBadge: Record<string, string> = {
  upload: "bg-indigo-100 text-indigo-700",
  command: "bg-slate-100 text-slate-600",
};

function formatTimestamp(iso: string): string {
  // The API returns UTC; keep the display in UTC to match the rest of the app.
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DatasetPanel({
  selectedDatasetId,
  onSelect,
  refreshKey = 0,
}: DatasetPanelProps) {
  const [datasets, setDatasets] = useState<Dataset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDatasets(null);
    setError(null);
    api
      .datasets()
      .then((data) => active && setDatasets(data))
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  // A null selection means "follow the active (latest) import".
  const activeId = datasets?.find((d) => d.is_active)?.id ?? null;
  const viewingId = selectedDatasetId ?? activeId;

  return (
    <Card
      title="Datasets"
      subtitle="Every import is kept as a version. View any one to load its full results (UTC)."
    >
      {error ? (
        <ErrorState message={error} />
      ) : datasets === null ? (
        <Loading />
      ) : datasets.length === 0 ? (
        <Empty message="No datasets imported yet." />
      ) : (
        <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">When (UTC)</th>
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Records</th>
                <th className="px-3 py-2 font-medium">Issues</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datasets.map((d) => {
                const isViewing = d.id === viewingId;
                return (
                  <tr
                    key={d.id}
                    className={isViewing ? "bg-emerald-50/70" : "hover:bg-slate-50"}
                  >
                    <td className="px-3 py-2 text-slate-600">
                      {formatTimestamp(d.created_at)}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {d.filename || "default file"}
                      {d.is_active && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                          Latest
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          sourceBadge[d.source] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {d.source}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{d.record_count}</td>
                    <td className="px-3 py-2 text-slate-500">{d.issue_count}</td>
                    <td className="px-3 py-2 text-right">
                      {isViewing ? (
                        <span className="text-xs font-semibold text-emerald-700">
                          Viewing
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelect(d.is_active ? null : d.id)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
