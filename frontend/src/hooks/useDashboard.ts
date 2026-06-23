import { useEffect, useState } from "react";
import { api } from "../api/client";
import type {
  ChartShift,
  Efficiency,
  Filters,
  Insight,
  ReasonBreakdown,
  ShiftRecord,
  Streak,
} from "../types";

export interface DashboardData {
  shifts: ShiftRecord[];
  chart: ChartShift[];
  efficiency: Efficiency;
  streaks: Streak[];
  breakdown: ReasonBreakdown;
  insights: Insight[];
}

interface State {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

// Re-fetches the full filtered view whenever filters change. A request counter
// guards against out-of-order responses from rapid filter edits.
export function useDashboard(
  filters: Filters,
  refreshKey = 0,
  datasetId: number | null = null
): State {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    Promise.all([
      api.shifts(filters, datasetId),
      api.chart(filters, datasetId),
      api.efficiency(filters, datasetId),
      api.streaks(filters, datasetId),
      api.reasonBreakdown(filters, datasetId),
      api.insights(filters, datasetId),
    ])
      .then(([shifts, chart, efficiency, streaks, breakdown, insights]) => {
        if (!active) return;
        setState({
          data: { shifts, chart, efficiency, streaks, breakdown, insights },
          loading: false,
          error: null,
        });
      })
      .catch((err: Error) => {
        if (!active) return;
        setState({ data: null, loading: false, error: err.message });
      });

    return () => {
      active = false;
    };
  }, [filters, refreshKey, datasetId]);

  return state;
}
