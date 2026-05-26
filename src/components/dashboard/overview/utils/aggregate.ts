import type {
  ActivityBucket,
  CategoryRow,
  DashboardAggregates,
  NormalizedJob,
  PerformerRow,
  Period,
  StatusRow,
} from "@/src/types/dashboard.types";

const CATEGORY_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];
const STATUS_COLORS: Record<string, string> = {
  Completed: "#6366f1",
  "In Progress": "#06b6d4",
  Scheduled: "#f59e0b",
  Pending: "#ef4444",
  Quote: "#a855f7",
  "Work Order": "#06b6d4",
  Unsuccessful: "#94a3b8",
};

const isCompleted = (j: NormalizedJob) => j.status.toLowerCase() === "completed";

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "??";

/**
 * Build the chart-ready buckets the dashboard needs from a flat list of
 * normalized jobs. Pure function — no side effects, easy to memo.
 */
export function aggregate(
  jobs: NormalizedJob[],
  period: Period,
): DashboardAggregates {
  // ── KPIs ────────────────────────────────────────────────────────────────
  const total_jobs = jobs.length;
  const total_revenue = jobs.reduce((s, j) => s + j.revenue, 0);
  const completedCount = jobs.filter(isCompleted).length;
  const completion_pct =
    total_jobs > 0 ? Math.round((completedCount / total_jobs) * 100) : 0;
  // Count unique engineers when available; fall back to unique customers so
  // the KPI stays meaningful even when engineer data is absent.
  const engineerKeys = jobs.map((j) => j.engineer_id ?? j.engineer_name).filter(Boolean);
  const active_teams = engineerKeys.length > 0
    ? new Set(engineerKeys).size
    : new Set(jobs.map((j) => j.customer_name).filter(Boolean)).size;

  // ── Activity buckets (X-axis label depends on period) ──────────────────
  const activity = buildActivity(jobs, period);

  // ── By category ────────────────────────────────────────────────────────
  const catMap = new Map<string, { jobs: number; revenue: number; completed: number }>();
  jobs.forEach((j) => {
    const name = j.category && j.category.trim() ? j.category : "Uncategorized";
    const cur = catMap.get(name) ?? { jobs: 0, revenue: 0, completed: 0 };
    cur.jobs += 1;
    cur.revenue += j.revenue;
    if (isCompleted(j)) cur.completed += 1;
    catMap.set(name, cur);
  });
  const by_category: CategoryRow[] = [...catMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 6)
    .map(([name, v], i) => ({
      name,
      jobs: v.jobs,
      revenue: Math.round(v.revenue),
      pct: v.jobs > 0 ? Math.round((v.completed / v.jobs) * 100) : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

  // ── Status counts (donut) ──────────────────────────────────────────────
  const statusMap = new Map<string, number>();
  jobs.forEach((j) => statusMap.set(j.status, (statusMap.get(j.status) ?? 0) + 1));
  const job_status: StatusRow[] = [...statusMap.entries()].map(([name, value], i) => ({
    name,
    value,
    color: STATUS_COLORS[name] ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  // ── Top performers ─────────────────────────────────────────────────────
  const perfMap = new Map<string, { name: string; jobs: number; revenue: number }>();
  jobs.forEach((j) => {
    const key = j.engineer_id ?? j.engineer_name;
    if (!key) return;
    const cur = perfMap.get(key) ?? {
      name: j.engineer_name ?? "Unknown",
      jobs: 0,
      revenue: 0,
    };
    cur.jobs += 1;
    cur.revenue += j.revenue;
    perfMap.set(key, cur);
  });
  const top_performers: PerformerRow[] = [...perfMap.entries()]
    .map(([staff_id, v]) => ({
      staff_id,
      name: v.name,
      jobs: v.jobs,
      revenue: Math.round(v.revenue),
      avatar: initials(v.name),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── Pending by weekday (last 7 days) ───────────────────────────────────
  const pending_by_day = buildPendingByDay(jobs);

  return {
    kpis: {
      total_jobs,
      total_revenue: Math.round(total_revenue),
      completion_pct,
      active_teams,
    },
    activity,
    by_category,
    job_status,
    top_performers,
    pending_by_day,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildActivity(jobs: NormalizedJob[], period: Period): ActivityBucket[] {
  const now = new Date();
  const buckets = makeBuckets(now, period);

  jobs.forEach((j) => {
    if (!j.date) return;
    const d = new Date(j.date);
    if (isNaN(d.getTime())) return;
    const idx = bucketIndexFor(d, now, period);
    if (idx < 0 || idx >= buckets.length) return;
    const b = buckets[idx];
    b.jobs += 1;
    b.revenue += j.revenue;
    if (isCompleted(j)) b.completed += 1;
    else b.pending += 1;
  });
  // round revenue at the end so intermediate sums stay precise
  return buckets.map((b) => ({ ...b, revenue: Math.round(b.revenue) }));
}

function makeBuckets(now: Date, period: Period): ActivityBucket[] {
  if (period === "week") {
    // Last 7 days, oldest first
    const out: ActivityBucket[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      out.push({
        label: d.toLocaleString("en-US", { weekday: "short" }),
        jobs: 0,
        completed: 0,
        revenue: 0,
        pending: 0,
      });
    }
    return out;
  }
  if (period === "month") {
    return [1, 2, 3, 4].map((n) => ({
      label: `Week ${n}`,
      jobs: 0,
      completed: 0,
      revenue: 0,
      pending: 0,
    }));
  }
  // year — last 12 months
  const out: ActivityBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      jobs: 0,
      completed: 0,
      revenue: 0,
      pending: 0,
    });
  }
  return out;
}

function bucketIndexFor(d: Date, now: Date, period: Period): number {
  if (period === "week") {
    const diffDays = Math.floor(
      (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000,
    );
    return 6 - diffDays;
  }
  if (period === "month") {
    // Bucket within current calendar month: Week 1..4
    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) {
      return -1;
    }
    return Math.min(3, Math.floor((d.getDate() - 1) / 7));
  }
  // year — months back from current month
  const monthsBack =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (monthsBack < 0 || monthsBack > 11) return -1;
  return 11 - monthsBack;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildPendingByDay(jobs: NormalizedJob[]): ActivityBucket[] {
  const now = new Date();
  const buckets: ActivityBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push({
      label: d.toLocaleString("en-US", { weekday: "short" }),
      jobs: 0,
      completed: 0,
      revenue: 0,
      pending: 0,
    });
  }
  jobs.forEach((j) => {
    if (isCompleted(j)) return;
    if (!j.date) return;
    const d = new Date(j.date);
    if (isNaN(d.getTime())) return;
    const diffDays = Math.floor(
      (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000,
    );
    const idx = 6 - diffDays;
    if (idx < 0 || idx >= 7) return;
    buckets[idx].jobs += 1;
    buckets[idx].pending += 1;
  });
  return buckets;
}
