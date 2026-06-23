import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";
import { DataQualityPanel } from "./components/DataQualityPanel";
import { DatasetPanel } from "./components/DatasetPanel";
import { EfficiencyCard } from "./components/EfficiencyCard";
import { FilterBar } from "./components/FilterBar";
import { InsightsPanel } from "./components/InsightsPanel";
import { KpiStrip } from "./components/KpiStrip";
import { ReasonBreakdownChart } from "./components/ReasonBreakdownChart";
import { ReasonPieChart } from "./components/ReasonPieChart";
import { ShiftChart } from "./components/ShiftChart";
import { StreakPanel } from "./components/StreakPanel";
import { ErrorState, Loading } from "./components/ui/States";
import { UploadButton } from "./components/UploadButton";
import { useDashboard } from "./hooks/useDashboard";
import type { Category, Filters, ImportSummary } from "./types";

const EMPTY_FILTERS: Filters = {
  dateFrom: "",
  dateTo: "",
  reasons: [],
  group: "",
  productive: "",
  minDuration: "",
  dimension: "reason",
};

export default function App() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  // Bumped after an upload or a dataset switch to re-pull every derived view.
  const [refreshKey, setRefreshKey] = useState(0);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  // null = follow the active (latest) import; a number = view that specific version.
  const [datasetId, setDatasetId] = useState<number | null>(null);

  useEffect(() => {
    api
      .categories()
      .then(setCategories)
      .catch((err: Error) => setCategoriesError(err.message));
  }, [refreshKey]);

  const reset = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const { data, loading, error } = useDashboard(filters, refreshKey, datasetId);

  const handleUploaded = useCallback((summary: ImportSummary) => {
    setImportSummary(summary);
    setFilters(EMPTY_FILTERS);
    setDatasetId(null); // jump to the freshly imported (now active) dataset
    setRefreshKey((k) => k + 1);
  }, []);

  const selectDataset = useCallback((id: number | null) => {
    setImportSummary(null);
    setFilters(EMPTY_FILTERS);
    setDatasetId(id);
    setRefreshKey((k) => k + 1);
  }, []);

  const viewingOlder = datasetId !== null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Shift Analytics Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Visualising and analysing employee shift records · all times in UTC
            </p>
          </div>
          <UploadButton onUploaded={handleUploaded} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {categoriesError ? (
          <ErrorState
            message={`Could not reach the API: ${categoriesError}. Is the backend running?`}
          />
        ) : (
          <>
            {importSummary && (
              <div
                className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
                  importSummary.records === 0
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <span>
                  {importSummary.records === 0 ? (
                    <>
                      <strong>{importSummary.filename}</strong> imported but produced{" "}
                      <strong>0 analytical records</strong> — check the file has the
                      expected columns. Your earlier data is safe; switch back to it in
                      the Datasets panel below.
                    </>
                  ) : (
                    <>
                      Imported <strong>{importSummary.filename}</strong>:{" "}
                      {importSummary.records} analytical records,{" "}
                      {importSummary.issues} data-quality{" "}
                      {importSummary.issues === 1 ? "issue" : "issues"} logged
                      {Object.keys(importSummary.actions).length > 0 && (
                        <>
                          {" ("}
                          {Object.entries(importSummary.actions)
                            .map(([action, count]) => `${count} ${action}`)
                            .join(", ")}
                          {")"}
                        </>
                      )}
                      .
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setImportSummary(null)}
                  className="shrink-0 text-current opacity-60 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}

            {viewingOlder && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <span>
                  Viewing an earlier dataset version. Charts and tables reflect that
                  import.
                </span>
                <button
                  type="button"
                  onClick={() => selectDataset(null)}
                  className="shrink-0 rounded-md border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  Back to latest
                </button>
              </div>
            )}

            <FilterBar
              filters={filters}
              categories={categories}
              onChange={setFilters}
              onReset={reset}
            />

            {error ? (
              <ErrorState message={error} />
            ) : loading || !data ? (
              <Loading message="Loading dashboard…" />
            ) : (
              <>
                <KpiStrip efficiency={data.efficiency} streaks={data.streaks} />

                <ShiftChart shifts={data.chart} categories={categories} />

                <EfficiencyCard efficiency={data.efficiency} />

                <div className="grid gap-6 lg:grid-cols-2">
                  <ReasonBreakdownChart breakdown={data.breakdown} />
                  <ReasonPieChart breakdown={data.breakdown} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <InsightsPanel insights={data.insights} />
                  <StreakPanel streaks={data.streaks} />
                </div>
              </>
            )}

            <DatasetPanel
              selectedDatasetId={datasetId}
              onSelect={selectDataset}
              refreshKey={refreshKey}
            />

            <DataQualityPanel refreshKey={refreshKey} datasetId={datasetId} />
          </>
        )}
      </main>
    </div>
  );
}
