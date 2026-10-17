"use client";

import { ACTION_EVENT_INTEGRATION_SLUGS } from "@/src/components/work-flow/apiIntegrations/actionEventTypesApi";
import {
  IntegrationSetupStep,
  type IntegrationSetupConfig,
  type IntegrationSetupStepProps,
} from "@/src/components/work-flow/appEvents/shared/setup/IntegrationSetupStep";

const COMMUSOFT_SETUP_CONFIG: IntegrationSetupConfig = {
  appId: "commusoft",
  appName: "Commusoft",
  appImage: "/image_1_commusoft.png",
  accentColor: "#f58320",
  actionEventSlug: ACTION_EVENT_INTEGRATION_SLUGS.COMMUSOFT,
};

export function CommusoftSetupStep(props: IntegrationSetupStepProps) {
  return <IntegrationSetupStep config={COMMUSOFT_SETUP_CONFIG} {...props} />;
}
