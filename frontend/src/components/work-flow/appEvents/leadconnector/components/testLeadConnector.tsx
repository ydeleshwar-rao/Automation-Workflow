"use client";

import React from "react";
import {
  IntegrationTestPanel,
  type IntegrationTestCopy,
  type IntegrationTestPanelProps,
} from "../../shared/test-panel/IntegrationTestPanel";

const LEAD_CONNECTOR_TEST_COPY: IntegrationTestCopy = {
  appName: "LeadConnector",
  actionTitle: "Create Contact in LeadConnector",
  actionDescription: "Testing the integration will create a contact with the following information:",
  actionSuccessMessage: (recordCount) =>
    recordCount > 1
      ? `Success! ${recordCount} contacts processed in LeadConnector.`
      : "Success! Contact created in LeadConnector.",
  idleTriggerHint: "Fetch a sample from LeadConnector using your configured pipeline and stage.",
};

type LeadConnectorTestStepProps = Omit<IntegrationTestPanelProps, "copy" | "testButtonPlacement" | "canRetryActions">;

export function LeadConnectorTestStep(props: LeadConnectorTestStepProps) {
  return <IntegrationTestPanel {...props} copy={LEAD_CONNECTOR_TEST_COPY} testButtonPlacement="empty-state" />;
}
