import { useIntegrationContext } from "@/src/components/app-connections/context/IntegrationContext";

export function useIntegrations() {
  const context = useIntegrationContext();
  return context;
}
