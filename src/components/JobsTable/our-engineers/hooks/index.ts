"use client";

import { useEffect, useMemo, useState } from "react";

import type { JobRow } from "../../types";
import { filterEngineerJobs, paginateEngineerJobs } from "../api";

export function useEngineers(jobs: JobRow[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredJobs = useMemo(() => filterEngineerJobs(jobs, searchQuery), [jobs, searchQuery]);
  const { paginated, total, totalPages, safePage } = useMemo(
    () => paginateEngineerJobs(filteredJobs, currentPage, PAGE_SIZE),
    [filteredJobs, currentPage]
  );

  useEffect(() => {
    if (safePage !== currentPage) setCurrentPage(safePage);
  }, [currentPage, safePage]);

  return {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    paginatedJobs: paginated,
    total,
    totalPages,
  };
}
