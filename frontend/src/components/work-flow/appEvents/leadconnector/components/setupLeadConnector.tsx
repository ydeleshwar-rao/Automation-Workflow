"use client";

import { ACTION_EVENT_INTEGRATION_SLUGS } from "@/src/components/work-flow/apiIntegrations/actionEventTypesApi";
import {
  IntegrationSetupStep,
  type IntegrationSetupConfig,
  type IntegrationSetupStepProps,
} from "@/src/components/work-flow/appEvents/shared/setup/IntegrationSetupStep";

const ACTION_EVENT_LABEL = "Action event";

const LEAD_CONNECTOR_SETUP_CONFIG: IntegrationSetupConfig = {
  appId: "leadshub",
  appName: "LeadConnector",
  // The underlying connection is branded LeadsHub, so the connect prompt keeps that name.
  connectAppName: "LeadsHub",
  appImage: "/image_2_leads_hub.png",
  accentColor: "#3fbfbb",
  actionEventSlug: ACTION_EVENT_INTEGRATION_SLUGS.LEADSHUB,
  // LeadConnector has always labelled the field "Action event", even when used as a trigger.
  eventFieldLabels: { trigger: ACTION_EVENT_LABEL, action: ACTION_EVENT_LABEL },
};

export function LeadConnectorSetupStep(props: IntegrationSetupStepProps) {
  return <IntegrationSetupStep config={LEAD_CONNECTOR_SETUP_CONFIG} {...props} />;
}
