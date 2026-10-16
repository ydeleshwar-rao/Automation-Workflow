"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

import { servicem8Api, type ServiceM8Job } from "../api/servicem8.api";

const COMPLETED_STATUS = "Completed";
const UNSUCCESSFUL_STATUS = "Unsuccessful";
const UNFULFILLED_STATUSES = ["Work Order", "Quote"];
const UNPAID_PAYMENT_VALUES: unknown[] = [null, undefined, "", 0, "0", false, "false"];
const DAYS_PER_WEEK = 7;

export type ServiceM8JobTab = "All" | "Unfulfilled" | "Unpaid" | "Open" | "Closed";

function isClosedJob(job: ServiceM8Job): boolean {
  return job.status === COMPLETED_STATUS || job.status === UNSUCCESSFUL_STATUS;
}

function isUnpaidJob(job: ServiceM8Job): boolean {
  return UNPAID_PAYMENT_VALUES.includes(job.payment_processed);
}

function isJobDatedThisWeek(job: ServiceM8Job, now: Date): boolean {
  if (!job.date) return false;
  const jobDate = new Date(job.date);
  if (Number.isNaN(jobDate.getTime())) return false;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (DAYS_PER_WEEK - 1 - now.getDay()));
  return jobDate >= startOfWeek && jobDate <= endOfWeek;
}

const JOB_TAB_FILTERS: Record<ServiceM8JobTab, (job: ServiceM8Job) => boolean> = {
  All: () => true,
  Unfulfilled: (job) => UNFULFILLED_STATUSES.includes(job.status ?? ""),
  Unpaid: isUnpaidJob,
  Open: (job) => !isClosedJob(job),
  Closed: isClosedJob,
};

/** Loads ServiceM8 jobs live through the backend and derives tab filters and summary stats. */
export function useServiceM8Jobs() {
  const [jobs, setJobs] = useState<ServiceM8Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ServiceM8JobTab>("All");

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setJobs(await servicem8Api.getJobs());
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      setError(`Failed to fetch jobs: ${message}`);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: jobs.length,
      completed: jobs.filter((job) => job.status === COMPLETED_STATUS).length,
      active: jobs.filter((job) => !isClosedJob(job)).length,
      revenue: jobs.reduce((total, job) => total + (Number(job.total_invoice_amount) || 0), 0),
      newThisWeek: jobs.filter((job) => isJobDatedThisWeek(job, now)).length,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => jobs.filter(JOB_TAB_FILTERS[activeTab]), [jobs, activeTab]);

  return {
    jobs,
    filteredJobs,
    stats,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    refreshJobs: fetchJobs,
  };
}
