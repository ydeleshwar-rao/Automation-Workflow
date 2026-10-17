"use client";

import {
  DISCONNECTED_STATUS,
  useGetIntegrationStatusesQuery,
  type IntegrationAppId,
} from "../apiIntegrations/integrationsApi";

/** Connection status of one integration, read from the shared integration-status cache. */
export function useIntegrationStatus(appId: IntegrationAppId) {
  const { data: integrationStatuses, isLoading, refetch } = useGetIntegrationStatusesQuery();
  const { isConnected, needsReauth } = integrationStatuses?.[appId] ?? DISCONNECTED_STATUS;

  return { isConnected, needsReauth, isLoading, refetch };
}
