"use client";

import { useIntegrationStatus } from "../../hooks/useIntegrationStatus";

/** Kept for workflow step consumers; new code should call `useIntegrationStatus("leadshub")`. */
export function useLeadsHubStatus() {
  const { isConnected, isLoading, refetch } = useIntegrationStatus("leadshub");
  return { connected: isConnected, isLoading, refetch };
}
