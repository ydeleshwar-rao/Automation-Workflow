"use client";

import { useIntegrationStatus } from "../../hooks/useIntegrationStatus";

/** Kept for workflow step consumers; new code should call `useIntegrationStatus("servicem8")`. */
export function useServiceM8Status() {
  const { isConnected, needsReauth, isLoading, refetch } = useIntegrationStatus("servicem8");
  return { connected: isConnected, needsReauth, isLoading, refetch };
}
