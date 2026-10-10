import type { JobRow } from "./types";

export function normalizeStatusKey(
  status: string
): "quote" | "workOrder" | "completed" | "other" {
  const s = status.trim().toLowerCase();
  if (s === "quote") return "quote";
  if (s === "work order" || s === "workorder") return "workOrder";
  if (s === "completed" || s === "yes") return "completed";
  return "other";
}

export function getServicem8StatsFromJobs(jobs: JobRow[]) {
  const total = jobs.length;
  const completed = jobs.filter((j) => normalizeStatusKey(j.status) === "completed").length;
  const active = jobs.filter((j) => {
    if (normalizeStatusKey(j.status) === "completed") return false;
    return j.status.trim().toLowerCase() !== "unsuccessful";
  }).length;
  const revenue = 0;
  const newThisWeek = 0;
  return { total, completed, active, revenue, newThisWeek };
}

export function buildStatusChartData(jobs: JobRow[]) {
  let quote = 0;
  let workOrder = 0;
  let completed = 0;
  for (const j of jobs) {
    const k = normalizeStatusKey(j.status);
    if (k === "quote") quote += 1;
    else if (k === "workOrder") workOrder += 1;
    else if (k === "completed") completed += 1;
  }
  return [
    { name: "Quote", count: quote },
    { name: "Work Order", count: workOrder },
    { name: "Completed", count: completed },
  ];
}
