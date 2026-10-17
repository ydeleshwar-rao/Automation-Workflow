"use client";

import React from "react";
import {
  IntegrationTestPanel,
  type IntegrationTestCopy,
  type IntegrationTestPanelProps,
} from "../../shared/test-panel/IntegrationTestPanel";

const COMMUSOFT_TEST_COPY: IntegrationTestCopy = {
  appName: "Commusoft",
  actionTitle: "Send to Commusoft",
  actionDescription: "Testing the integration will send the following data to Commusoft:",
  actionSuccessMessage: (recordCount) =>
    recordCount > 1 ? `Success! ${recordCount} records processed for Commusoft.` : "Success! Data sent to Commusoft.",
  idleTriggerHint: "Use the button above to fetch sample data.",
};

type CommusoftTestStepProps = Omit<IntegrationTestPanelProps, "copy" | "testButtonPlacement" | "canRetryActions">;

export function CommusoftTestStep(props: CommusoftTestStepProps) {
  return <IntegrationTestPanel {...props} copy={COMMUSOFT_TEST_COPY} testButtonPlacement="header" canRetryActions />;
}
