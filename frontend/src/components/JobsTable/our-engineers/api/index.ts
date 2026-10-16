import type { JobRow } from "../../types";

export function filterEngineerJobs(jobs: JobRow[], query: string): JobRow[] {
  if (!query.trim()) return jobs;
  const normalizedQuery = query.toLowerCase().trim();
  return jobs.filter(
    (job) =>
      job.name?.toLowerCase().includes(normalizedQuery) ||
      job.email?.toLowerCase().includes(normalizedQuery) ||
      job.phone?.toLowerCase().includes(normalizedQuery) ||
      job.address?.toLowerCase().includes(normalizedQuery)
  );
}

export function paginateEngineerJobs(jobs: JobRow[], page: number, pageSize: number) {
  const total = jobs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const paginated = jobs.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { paginated, total, totalPages, safePage };
}
