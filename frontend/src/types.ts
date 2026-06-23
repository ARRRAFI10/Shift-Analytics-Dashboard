export interface Category {
  id: number;
  name: string;
  group: string;
  is_productive: boolean;
  color: string;
}

export interface ShiftRecord {
  id: number;
  day_date: string;
  start: string;
  end: string;
  duration_hours: number;
  stated_hours: number | null;
  reason: string;
  group: string;
  is_productive: boolean;
  status: "clean" | "corrected";
  color: string;
}

export interface ChartShift {
  id: number;
  date: string;
  start: string;
  end: string;
  start_time: string;
  end_time: string;
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  reason: string;
  color: string;
}

export interface DayEfficiency {
  date: string;
  productive_hours: number;
  non_productive_hours: number;
  total_hours: number;
  score: number;
}

export interface Efficiency {
  overall: {
    productive_hours: number;
    non_productive_hours: number;
    total_hours: number;
    score: number;
    record_count: number;
  };
  per_day: DayEfficiency[];
}

export interface Streak {
  category: string;
  start_date: string;
  end_date: string;
  length_days: number;
  total_hours: number;
}

export interface ReasonBreakdownItem {
  key: string;
  total_hours: number;
  record_count: number;
  is_productive: boolean;
  color: string;
}

export interface ReasonBreakdown {
  dimension: "reason" | "group";
  results: ReasonBreakdownItem[];
}

export interface Insight {
  type: string;
  title: string;
  metric: string;
  message: string;
}

export interface QualityIssue {
  id: number;
  row_index: number;
  raw_data: Record<string, unknown>;
  issue_type: string;
  description: string;
  action_taken: "corrected" | "quarantined" | "flagged";
  created_at: string;
}

export interface ImportSummary {
  dataset_id: number;
  filename: string;
  records: number;
  issues: number;
  actions: Record<string, number>;
}

export interface Dataset {
  id: number;
  filename: string;
  source: "command" | "upload";
  record_count: number;
  issue_count: number;
  actions: Record<string, number>;
  is_active: boolean;
  created_at: string;
}

export type Dimension = "reason" | "group";

export interface Filters {
  dateFrom: string;
  dateTo: string;
  reasons: string[];
  group: string;
  productive: "" | "true" | "false";
  minDuration: string;
  dimension: Dimension;
}
