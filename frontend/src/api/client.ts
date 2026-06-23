import type {
  Category,
  ChartShift,
  Dataset,
  Efficiency,
  Filters,
  ImportSummary,
  Insight,
  QualityIssue,
  ReasonBreakdown,
  ShiftRecord,
  Streak,
} from "../types";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api").replace(
  /\/$/,
  ""
);

interface Paginated<T> {
  results: T[];
}

// The analytics-affecting filters translate directly to backend query params, plus
// an optional dataset id selecting which imported version to read. `dimension` is
// excluded here; only reason-breakdown consumes it.
function queryParams(filters: Filters, datasetId?: number | null): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (filters.reasons.length) params.set("reason", filters.reasons.join(","));
  if (filters.group) params.set("group", filters.group);
  if (filters.productive) params.set("productive", filters.productive);
  if (filters.minDuration) params.set("min_duration", filters.minDuration);
  if (datasetId != null) params.set("dataset", String(datasetId));
  return params;
}

async function get<T>(path: string, params?: URLSearchParams): Promise<T> {
  const query = params && [...params].length ? `?${params}` : "";
  const response = await fetch(`${BASE_URL}${path}${query}`);
  if (!response.ok) {
    throw new Error(`Request to ${path} failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  categories: () => {
    const params = new URLSearchParams({ page_size: "500" });
    return get<Paginated<Category>>("/categories/", params).then((r) => r.results);
  },

  datasets: () => {
    const params = new URLSearchParams({ page_size: "500" });
    return get<Paginated<Dataset>>("/datasets/", params).then((r) => r.results);
  },

  shifts: (filters: Filters, datasetId?: number | null) => {
    const params = queryParams(filters, datasetId);
    params.set("page_size", "500");
    return get<Paginated<ShiftRecord>>("/shifts/", params).then((r) => r.results);
  },

  chart: (filters: Filters, datasetId?: number | null) =>
    get<ChartShift[]>("/shifts/chart/", queryParams(filters, datasetId)),

  efficiency: (filters: Filters, datasetId?: number | null) =>
    get<Efficiency>("/analytics/efficiency/", queryParams(filters, datasetId)),

  streaks: (filters: Filters, datasetId?: number | null) =>
    get<Streak[]>("/analytics/streaks/", queryParams(filters, datasetId)),

  reasonBreakdown: (filters: Filters, datasetId?: number | null) => {
    const params = queryParams(filters, datasetId);
    params.set("dimension", filters.dimension);
    return get<ReasonBreakdown>("/analytics/reason-breakdown/", params);
  },

  insights: (filters: Filters, datasetId?: number | null) =>
    get<Insight[]>("/analytics/insights/", queryParams(filters, datasetId)),

  qualityIssues: (datasetId?: number | null) => {
    const params = new URLSearchParams({ page_size: "500" });
    if (datasetId != null) params.set("dataset", String(datasetId));
    return get<Paginated<QualityIssue>>("/quality-issues/", params).then(
      (r) => r.results
    );
  },

  importFile: async (file: File): Promise<ImportSummary> => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${BASE_URL}/import/`, {
      method: "POST",
      body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.detail ?? `Upload failed (${response.status})`);
    }
    return body as ImportSummary;
  },
};
