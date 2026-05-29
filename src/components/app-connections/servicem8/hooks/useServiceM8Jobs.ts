"use client";

import { useState, useEffect, useMemo } from "react";

import { servicem8Api } from "../api/servicem8.api";
// import { createClient } from "@/src/lib/supabase/client"; // TEMP: used when Supabase realtime is re-enabled

// TODO: REVERT — restore connection check and real API fetch
// after JobsTable UI is complete and credentials are available
// (Servicem8JobsView currently uses JobsTable mock data; re-wire this hook when reverting.)

// ─── Simple in-memory fetch of jobs via our server-side route ────────────────
async function fetchJobsFromApi(): Promise<any[]> {
  return servicem8Api.getJobs();
}

export function useServiceM8Jobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("All");

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TEMP DISABLED — uncomment when real credentials are available
      // const fetchedJobs = await fetchJobsFromApi();
      // setJobs(fetchedJobs);
      setJobs([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch jobs: ${msg}`);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // TEMP DISABLED — re-enable after charts UI is complete
    // ─── Setup Supabase Realtime Subscription ────────────────
    // const supabase = createClient();
    //
    // const channel = supabase
    //   .channel("servicem8_realtime_changes")
    //   .on(
    //     "postgres_changes",
    //     { event: "*", schema: "public", table: "servicem8_jobs" },
    //     () => fetchJobs()
    //   )
    //   .on(
    //     "postgres_changes",
    //     { event: "*", schema: "public", table: "servicem8_job_contacts" },
    //     () => fetchJobs()
    //   )
    //   .subscribe();
    //
    // return () => {
    //   supabase.removeChannel(channel);
    // };
  }, []);

  const stats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter((j) => j.status === "Completed").length;
    const active = jobs.filter(
      (j) => j.status !== "Completed" && j.status !== "Unsuccessful"
    ).length;
    const revenue = jobs.reduce(
      (acc, curr) => acc + (Number(curr.total_invoice_amount) || 0),
      0
    );
    const newThisWeek = jobs.filter((j) => {
      if (!j.date) return false;
      try {
        const jobDate = new Date(j.date);
        const now = new Date();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay()));
        return jobDate >= startOfWeek && jobDate <= endOfWeek;
      } catch { return false; }
    }).length;
    return { total, completed, active, revenue, newThisWeek };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (activeTab === "All") return jobs;
    if (activeTab === "Unfulfilled") return jobs.filter((j) => j.status === "Work Order" || j.status === "Quote");
    if (activeTab === "Unpaid") return jobs.filter((j) => !j.payment_processed || j.payment_processed === "0" || j.payment_processed === "false");
    if (activeTab === "Open") return jobs.filter((j) => j.status !== "Completed" && j.status !== "Unsuccessful");
    if (activeTab === "Closed") return jobs.filter((j) => j.status === "Completed" || j.status === "Unsuccessful");
    return jobs;
  }, [jobs, activeTab]);

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


