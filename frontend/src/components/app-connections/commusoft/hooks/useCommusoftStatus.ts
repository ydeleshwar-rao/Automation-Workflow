"use client";

import { useIntegrationStatus } from "../../hooks/useIntegrationStatus";

/** Kept for workflow step consumers; new code should call `useIntegrationStatus("commusoft")`. */
export function useCommusoftStatus() {
  const { isConnected, isLoading, refetch } = useIntegrationStatus("commusoft");
  return { connected: isConnected, isLoading, refetch };
}
