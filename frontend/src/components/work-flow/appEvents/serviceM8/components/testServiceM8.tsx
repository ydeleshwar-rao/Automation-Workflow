"use client";

import React from "react";
import {
  IntegrationTestPanel,
  type IntegrationTestCopy,
  type IntegrationTestPanelProps,
} from "../../shared/test-panel/IntegrationTestPanel";

const SERVICE_M8_TEST_COPY: IntegrationTestCopy = {
  appName: "ServiceM8",
  actionTitle: "Create Job in ServiceM8",
  actionDescription: "Testing the integration will create a job with the following information:",
  actionSuccessMessage: () => "Success! Job created in ServiceM8.",
  idleTriggerHint: 'Click "Test trigger" to fetch sample data',
};

type ServiceM8TestStepProps = Omit<IntegrationTestPanelProps, "copy" | "testButtonPlacement" | "canRetryActions">;

// The "Test trigger" button lives in the step footer for ServiceM8, so the panel shows none.
export function ServiceM8TestStep(props: ServiceM8TestStepProps) {
  return <IntegrationTestPanel {...props} copy={SERVICE_M8_TEST_COPY} testButtonPlacement="none" />;
}
