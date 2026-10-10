import type { JobRow } from "../../types";

export function filterJobs(jobs: JobRow[], query: string): JobRow[] {
  if (!query.trim()) return jobs;
  const q = query.toLowerCase().trim();
  return jobs.filter(
    (j) =>
      j.name?.toLowerCase().includes(q) ||
      j.email?.toLowerCase().includes(q) ||
      j.phone?.toLowerCase().includes(q) ||
      j.address?.toLowerCase().includes(q)
  );
}

export function paginateJobs(jobs: JobRow[], page: number, pageSize: number) {
  const total = jobs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const paginated = jobs.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { paginated, total, totalPages, safePage };
}

export function getInviteStats(jobs: JobRow[]) {
  return {
    withLogins: jobs.filter((j) => !!(j.email ?? "").trim()).length,
    invitesPending: jobs.filter((j) => !(j.email ?? "").trim()).length,
  };
}
