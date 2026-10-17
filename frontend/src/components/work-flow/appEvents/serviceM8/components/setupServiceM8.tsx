"use client";

import { ACTION_EVENT_INTEGRATION_SLUGS } from "@/src/components/work-flow/apiIntegrations/actionEventTypesApi";
import {
  IntegrationSetupStep,
  type IntegrationSetupConfig,
  type IntegrationSetupStepProps,
} from "@/src/components/work-flow/appEvents/shared/setup/IntegrationSetupStep";

const SERVICE_M8_SETUP_CONFIG: IntegrationSetupConfig = {
  appId: "servicem8",
  appName: "ServiceM8",
  appImage: "/image_3_servicem8.png",
  accentColor: "#7cc736",
  actionEventSlug: ACTION_EVENT_INTEGRATION_SLUGS.SERVICE_M8,
};

export function ServiceM8SetupStep(props: IntegrationSetupStepProps) {
  return <IntegrationSetupStep config={SERVICE_M8_SETUP_CONFIG} {...props} />;
}
