"use client";

import { useEffect, useState } from "react";
import { commusoftApi } from "../api/commusoft.api";

export function useCommusoftJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response: any = await commusoftApi.getJobs();
      const rawData =
        response?.data?.data ??
        response?.data ??
        [];
      setJobs(Array.isArray(rawData) ? rawData : []);
    } catch (err: any) {
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return { jobs, isLoading, isError, error, refetch: fetchJobs };
}
