/**
 * useIntegrations
 * ─────────────────────────────────────────────────────────────
 * Thin wrapper around IntegrationContext.
 * Re-exported here so sidebar and other consumers don't need to
 * import directly from the context file.
 */

import { useIntegrationContext } from "@/src/components/app-connections/context/IntegrationContext";

export function useIntegrations() {
  return useIntegrationContext();
}
