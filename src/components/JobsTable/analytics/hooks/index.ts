"use client";

import { useMemo } from "react";

import type { JobRow } from "../../types";
import { getAnalyticsStats, getStatusChartData } from "../api";

export function useAnalytics(jobs: JobRow[], loading: boolean) {
  const stats = useMemo(() => getAnalyticsStats(jobs), [jobs]);
  const chartData = useMemo(() => getStatusChartData(jobs), [jobs]);
  return { stats, chartData, loading };
}
