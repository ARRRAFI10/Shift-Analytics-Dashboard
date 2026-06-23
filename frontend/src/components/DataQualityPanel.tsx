import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { QualityIssue } from "../types";
import { Card } from "./ui/Card";
import { Empty, ErrorState, Loading } from "./ui/States";

type ActionFilter = "all" | "corrected" | "quarantined" | "flagged";

const actionBadge: Record<string, string> = {
  corrected: "bg-amber-100 text-amber-700",
  quarantined: "bg-red-100 text-red-700",
  flagged: "bg-blue-100 text-blue-700",
};

interface DataQualityPanelProps {
  refreshKey?: number;
  datasetId?: number | null;
}

export function DataQualityPanel({
  refreshKey = 0,
  datasetId = null,
}: DataQualityPanelProps) {
  const [issues, setIssues] = useState<QualityIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActionFilter>("all");

  useEffect(() => {
    let active = true;
    setIssues(null);
    setError(null);
    api
      .qualityIssues(datasetId)
      .then((data) => active && setIssues(data))
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [refreshKey, datasetId]);

  const counts = useMemo(() => {
    const base = { corrected: 0, quarantined: 0, flagged: 0 } as Record<string, number>;
    for (const issue of issues ?? []) base[issue.action_taken] += 1;
    return base;
  }, [issues]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? issues ?? []
        : (issues ?? []).filter((i) => i.action_taken === filter),
    [issues, filter]
  );

  const tabs: ActionFilter[] = ["all", "corrected", "quarantined", "flagged"];

  return (
    <Card
      title="Data Quality Log"
      subtitle="Every cleaning decision made during ingestion, kept for transparency"
      actions={
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 capitalize transition ${
                filter === tab
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab}
              {tab !== "all" && (
                <span className="ml-1 text-[10px] opacity-70">{counts[tab]}</span>
              )}
            </button>
          ))}
        </div>
      }
    >
      {error ? (
        <ErrorState message={error} />
      ) : issues === null ? (
        <Loading />
      ) : visible.length === 0 ? (
        <Empty message="No issues recorded." />
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">Issue</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Raw data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((issue) => (
                <tr key={issue.id} className="align-top hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-500">{issue.row_index}</td>
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {issue.issue_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        actionBadge[issue.action_taken] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {issue.action_taken}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{issue.description}</td>
                  <td className="px-3 py-2">
                    <code className="block max-w-xs whitespace-pre-wrap break-words text-xs text-slate-400">
                      {JSON.stringify(issue.raw_data)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
