import type { JobRow } from "../../types";

function isCompletedStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return s === "completed" || s === "yes" || s === "complete";
}

function isExcludedActiveStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return s === "unsuccessful" || s === "cancelled" || s === "canceled";
}

export function getAnalyticsStats(jobs: JobRow[]) {
  const total = jobs.length;
  const completed = jobs.filter((j) => isCompletedStatus(j.status)).length;
  const active = jobs.filter((j) => !isCompletedStatus(j.status) && !isExcludedActiveStatus(j.status)).length;
  const revenue = jobs.reduce((acc, j) => {
    const amount = parseFloat(String(j.total_invoice_amount ?? j.revenue ?? "0"));
    return acc + (Number.isNaN(amount) ? 0 : amount);
  }, 0);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = jobs.filter((j) => {
    if (!j.date) return false;
    const t = new Date(j.date).getTime();
    return !isNaN(t) && t >= weekAgo;
  }).length;

  return { total, completed, active, revenue, newThisWeek };
}

export function getStatusChartData(jobs: JobRow[]) {
  const counts: Record<string, number> = {};
  jobs.forEach((j) => {
    const raw = (j.status || "Unknown").trim();
    const normalizedLower = raw.toLowerCase();
    let status = raw || "Unknown";
    if (normalizedLower === "yes") status = "Completed";
    if (normalizedLower === "complete") status = "Completed";
    counts[status] = (counts[status] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}
