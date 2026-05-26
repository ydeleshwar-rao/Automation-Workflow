/**
 * Common dashboard data shapes shared across integrations.
 *
 * Every integration adapter (ServiceM8, Commusoft, SimPro, …) must normalize
 * its raw job records into `NormalizedJob` so the aggregation layer and the
 * dashboard UI can stay integration-agnostic.
 */

export type Period = "week" | "month" | "year";

export interface JobsFilters {
  period?: Period;
  date_from?: string;        // YYYY-MM-DD
  date_to?: string;          // YYYY-MM-DD
  status?: string;
  category_uuid?: string;
  category_name?: string;
  queue_uuid?: string;
  queue_name?: string;
  staff_uuid?: string;
  company_uuid?: string;
}

/** Application-agnostic job row used by every chart/aggregate on the dashboard. */
export interface NormalizedJob {
  id: string;                    // generated_job_id or equivalent
  status: string;                // raw status string ("Completed", "Quote", …)
  date: string | null;           // ISO or YYYY-MM-DD; null if missing
  completion_date: string | null;
  category: string | null;       // resolved name, not uuid
  revenue: number;               // 0 if absent
  engineer_id: string | null;
  engineer_name: string | null;
  customer_name: string | null;
  description: string | null;
  raw: unknown;                  // original integration payload — for drill-down
}

export interface DashboardKpis {
  total_jobs: number;
  total_revenue: number;
  completion_pct: number;
  active_teams: number;
}

export interface ActivityBucket {
  label: string;
  jobs: number;
  completed: number;
  revenue: number;
  pending: number;
}

export interface CategoryRow {
  name: string;
  jobs: number;
  revenue: number;
  pct: number;            // completion %
  color: string;
}

export interface StatusRow {
  name: string;
  value: number;
  color: string;
}

export interface PerformerRow {
  staff_id: string;
  name: string;
  jobs: number;
  revenue: number;
  avatar: string;         // initials
}

export interface DashboardAggregates {
  kpis: DashboardKpis;
  activity: ActivityBucket[];
  by_category: CategoryRow[];
  job_status: StatusRow[];
  top_performers: PerformerRow[];
  pending_by_day: ActivityBucket[];
}
