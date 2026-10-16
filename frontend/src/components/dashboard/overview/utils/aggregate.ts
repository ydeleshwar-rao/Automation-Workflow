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

const isCompleted = (job: NormalizedJob) => job.status.toLowerCase() === "completed";

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0]?.toUpperCase() ?? "")
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
  const total_revenue = jobs.reduce((sum, job) => sum + job.revenue, 0);
  const completedCount = jobs.filter(isCompleted).length;
  const completion_pct =
    total_jobs > 0 ? Math.round((completedCount / total_jobs) * 100) : 0;
  // Count unique engineers when available; fall back to unique customers so
  // the KPI stays meaningful even when engineer data is absent.
  const engineerKeys = jobs.map((job) => job.engineer_id ?? job.engineer_name).filter(Boolean);
  const active_teams = engineerKeys.length > 0
    ? new Set(engineerKeys).size
    : new Set(jobs.map((job) => job.customer_name).filter(Boolean)).size;

  // ── Activity buckets (X-axis label depends on period) ──────────────────
  const activity = buildActivity(jobs, period);

  // ── By category ────────────────────────────────────────────────────────
  const categoryMap = new Map<string, { jobs: number; revenue: number; completed: number }>();
  jobs.forEach((job) => {
    const name = job.category && job.category.trim() ? job.category : "Uncategorized";
    const categoryTotals = categoryMap.get(name) ?? { jobs: 0, revenue: 0, completed: 0 };
    categoryTotals.jobs += 1;
    categoryTotals.revenue += job.revenue;
    if (isCompleted(job)) categoryTotals.completed += 1;
    categoryMap.set(name, categoryTotals);
  });
  const by_category: CategoryRow[] = [...categoryMap.entries()]
    .sort((firstEntry, secondEntry) => secondEntry[1].revenue - firstEntry[1].revenue)
    .slice(0, 6)
    .map(([name, totals], index) => ({
      name,
      jobs: totals.jobs,
      revenue: Math.round(totals.revenue),
      pct: totals.jobs > 0 ? Math.round((totals.completed / totals.jobs) * 100) : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

  // ── Status counts (donut) ──────────────────────────────────────────────
  const statusMap = new Map<string, number>();
  jobs.forEach((job) => statusMap.set(job.status, (statusMap.get(job.status) ?? 0) + 1));
  const job_status: StatusRow[] = [...statusMap.entries()].map(([name, value], index) => ({
    name,
    value,
    color: STATUS_COLORS[name] ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

  // ── Top performers ─────────────────────────────────────────────────────
  const performerMap = new Map<string, { name: string; jobs: number; revenue: number }>();
  jobs.forEach((job) => {
    const key = job.engineer_id ?? job.engineer_name;
    if (!key) return;
    const performerTotals = performerMap.get(key) ?? {
      name: job.engineer_name ?? "Unknown",
      jobs: 0,
      revenue: 0,
    };
    performerTotals.jobs += 1;
    performerTotals.revenue += job.revenue;
    performerMap.set(key, performerTotals);
  });
  const top_performers: PerformerRow[] = [...performerMap.entries()]
    .map(([staff_id, totals]) => ({
      staff_id,
      name: totals.name,
      jobs: totals.jobs,
      revenue: Math.round(totals.revenue),
      avatar: initials(totals.name),
    }))
    .sort((firstPerformer, secondPerformer) => secondPerformer.revenue - firstPerformer.revenue)
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

  jobs.forEach((job) => {
    if (!job.date) return;
    const jobDate = new Date(job.date);
    if (isNaN(jobDate.getTime())) return;
    const bucketIndex = bucketIndexFor(jobDate, now, period);
    if (bucketIndex < 0 || bucketIndex >= buckets.length) return;
    const bucket = buckets[bucketIndex];
    bucket.jobs += 1;
    bucket.revenue += job.revenue;
    if (isCompleted(job)) bucket.completed += 1;
    else bucket.pending += 1;
  });
  // round revenue at the end so intermediate sums stay precise
  return buckets.map((bucket) => ({ ...bucket, revenue: Math.round(bucket.revenue) }));
}

function makeBuckets(now: Date, period: Period): ActivityBucket[] {
  if (period === "week") {
    // Last 7 days, oldest first
    const dayBuckets: ActivityBucket[] = [];
    for (let i = 6; i >= 0; i--) {
      const bucketDate = new Date(now);
      bucketDate.setDate(bucketDate.getDate() - i);
      dayBuckets.push({
        label: bucketDate.toLocaleString("en-US", { weekday: "short" }),
        jobs: 0,
        completed: 0,
        revenue: 0,
        pending: 0,
      });
    }
    return dayBuckets;
  }
  if (period === "month") {
    return [1, 2, 3, 4].map((weekNumber) => ({
      label: `Week ${weekNumber}`,
      jobs: 0,
      completed: 0,
      revenue: 0,
      pending: 0,
    }));
  }
  // year — last 12 months
  const monthBuckets: ActivityBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({
      label: bucketDate.toLocaleString("en-US", { month: "short" }),
      jobs: 0,
      completed: 0,
      revenue: 0,
      pending: 0,
    });
  }
  return monthBuckets;
}

function bucketIndexFor(jobDate: Date, now: Date, period: Period): number {
  if (period === "week") {
    const diffDays = Math.floor(
      (startOfDay(now).getTime() - startOfDay(jobDate).getTime()) / 86400000,
    );
    return 6 - diffDays;
  }
  if (period === "month") {
    // Bucket within current calendar month: Week 1..4
    if (jobDate.getFullYear() !== now.getFullYear() || jobDate.getMonth() !== now.getMonth()) {
      return -1;
    }
    return Math.min(3, Math.floor((jobDate.getDate() - 1) / 7));
  }
  // year — months back from current month
  const monthsBack =
    (now.getFullYear() - jobDate.getFullYear()) * 12 + (now.getMonth() - jobDate.getMonth());
  if (monthsBack < 0 || monthsBack > 11) return -1;
  return 11 - monthsBack;
}

function startOfDay(date: Date): Date {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

function buildPendingByDay(jobs: NormalizedJob[]): ActivityBucket[] {
  const now = new Date();
  const buckets: ActivityBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const bucketDate = new Date(now);
    bucketDate.setDate(bucketDate.getDate() - i);
    buckets.push({
      label: bucketDate.toLocaleString("en-US", { weekday: "short" }),
      jobs: 0,
      completed: 0,
      revenue: 0,
      pending: 0,
    });
  }
  jobs.forEach((job) => {
    if (isCompleted(job)) return;
    if (!job.date) return;
    const jobDate = new Date(job.date);
    if (isNaN(jobDate.getTime())) return;
    const diffDays = Math.floor(
      (startOfDay(now).getTime() - startOfDay(jobDate).getTime()) / 86400000,
    );
    const bucketIndex = 6 - diffDays;
    if (bucketIndex < 0 || bucketIndex >= 7) return;
    buckets[bucketIndex].jobs += 1;
    buckets[bucketIndex].pending += 1;
  });
  return buckets;
}
