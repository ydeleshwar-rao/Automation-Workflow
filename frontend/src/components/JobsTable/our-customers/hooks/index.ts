"use client";

import { useEffect, useMemo, useState } from "react";

import type { JobRow } from "../../types";
import { filterJobs, getInviteStats, paginateJobs } from "../api";

export function useCustomers(jobs: JobRow[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Reset to page 1 when a new API batch arrives (jobs array reference changes)
  useEffect(() => {
    setCurrentPage(1);
  }, [jobs]);

  const filteredJobs = useMemo(() => filterJobs(jobs, searchQuery), [jobs, searchQuery]);

  const { paginated, total, totalPages, safePage } = useMemo(
    () => paginateJobs(filteredJobs, currentPage, PAGE_SIZE),
    [filteredJobs, currentPage]
  );

  useEffect(() => {
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  const stats = useMemo(() => getInviteStats(jobs), [jobs]);

  return {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    paginatedJobs: paginated,
    total,
    totalPages,
    stats,
  };
}
