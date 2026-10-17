"use client";

import { useCallback, useMemo, useState } from "react";
import { LeadConnectorSetupStep } from "./components/setupLeadConnector";
import { LeadConnectorConfigureStep } from "./components/configureLeadConnector";
import { LeadConnectorTestStep } from "./components/testLeadConnector";
import type { IntegrationDescriptor, StepContext } from "../../uiOrchestrator/types";
import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";
import { usePollingTriggerSamples } from "../../apiIntegrations/usePollingTriggerSamples";
import { stripInternalConfigKeys } from "../../apiIntegrations/nodeConfig.utils";
import type { PollingSample } from "../../apiIntegrations/workflowApi";
import { useTestAddUpdateOpportunityMutation } from "./apiIntegrations/leadConnectorApi";

const LEADSHUB_INTEGRATION_KEY = "leadshub";

/** Trigger event keys handled by the polling engine (integration_key = "leadshub") */
const POLLING_TRIGGER_EVENTS = new Set([
  "add_update_opportunity",
  "pipeline_stage_changed",
]);

type TestStatus = "idle" | "testing" | "success" | "failed";
type ActionTestRunner = (payload: Record<string, unknown>) => Promise<unknown>;

/** Some test routes wrap the result in `{ data }`, others return it bare. */
function unwrapActionResult(response: unknown): unknown {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: unknown }).data ?? response;
  }
  return response;
}

function useLeadConnectorStepProps(step: ConfigStep, context: StepContext) {
  const [pollingSubscriptionId, setPollingSubscriptionId] = useState<string | null>(
    context.node.config?._pollingSubscriptionId ?? null
  );
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [sampleData, setSampleData] = useState<PollingSample[] | null>(null);

  const fetchPollingSamples = usePollingTriggerSamples();
  const [testAddUpdateOpportunity] = useTestAddUpdateOpportunityMutation();

  /** Action event keys mapped to the backend test call that runs them. */
  const actionTestRunners = useMemo<Record<string, ActionTestRunner>>(
    () => ({
      add_update_opportunity: (payload) => testAddUpdateOpportunity(payload).unwrap(),
    }),
    [testAddUpdateOpportunity]
  );

  const runTriggerTest = useCallback(
    async (eventKey: string, payload: Record<string, unknown>) => {
      const workflowId = context.node.workflowId;
      const nodeId = context.node.id;
      if (!workflowId || !nodeId) {
        console.error("Missing subscription fields:", { workflowId, nodeId });
        setTestStatus("failed");
        return;
      }

      setTestStatus("testing");
      try {
        const samples = await fetchPollingSamples(
          {
            workflow_id: workflowId,
            node_id: nodeId,
            integration_key: LEADSHUB_INTEGRATION_KEY,
            event_key: eventKey,
            config: payload,
          },
          (subscriptionId) => {
            if (subscriptionId === pollingSubscriptionId) return;
            setPollingSubscriptionId(subscriptionId);
            context.onFormDataChange({ ...context.node.config, _pollingSubscriptionId: subscriptionId });
          }
        );
        if (!samples || samples.length === 0) {
          setTestStatus("failed");
          return;
        }
        setSampleData(samples);
        setTestStatus("success");
        context.onFormDataChange({ testPayload: samples[0], testSamples: samples });
      } catch (error) {
        console.error("LeadsHub trigger test failed:", error);
        setTestStatus("failed");
      }
    },
    [context, fetchPollingSamples, pollingSubscriptionId]
  );

  const runActionTest = useCallback(
    async (eventKey: string, payload: Record<string, unknown>) => {
      const runActionTestCall = actionTestRunners[eventKey];
      if (!runActionTestCall) {
        console.error(`No endpoint configured for LeadConnector action: ${eventKey}`);
        setTestStatus("failed");
        return;
      }

      setTestStatus("testing");
      try {
        const result = unwrapActionResult(await runActionTestCall(payload));
        setSampleData(result ? [result as PollingSample] : null);
        setTestStatus("success");
      } catch (error) {
        console.error("LeadConnector action test failed:", error);
        setTestStatus("failed");
      }
    },
    [actionTestRunners]
  );

  const runTest = useCallback(async () => {
    const payload = stripInternalConfigKeys(context.node.config || {});
    // eventLabel holds the action_key (see setupLeadConnector — onEventSelect passes id).
    const eventKey = context.node.eventLabel ?? "";

    if (context.isTrigger && POLLING_TRIGGER_EVENTS.has(eventKey)) {
      await runTriggerTest(eventKey, payload);
      return;
    }
    await runActionTest(eventKey, payload);
  }, [context.node.config, context.node.eventLabel, context.isTrigger, runTriggerTest, runActionTest]);

  const footer = useMemo(() => {
    if (step === "setup") {
      if (!context.node.eventLabel) {
        return {
          label: "To continue, choose an event",
          disabled: true,
        };
      }
      return {
        label: "Continue",
        disabled: false,
        variant: "orange" as const,
      };
    }
    if (step === "configure") {
      // Triggers don't require fields — always allow Continue.
      if (context.isTrigger) {
        return {
          label: "Continue",
          disabled: false,
          variant: "orange" as const,
        };
      }
      const isValid = context.node.config?._formIsValid === true;
      return {
        label: isValid ? "Continue" : "Fill required fields",
        disabled: !isValid,
        variant: "orange" as const,
      };
    }
    if (step === "test") {
      return {
        layout: "test-controls" as const,
        onTestTrigger: runTest,
      };
    }
    return undefined;
  }, [step, context.node.eventLabel, context.node.config?._formIsValid, context.isTrigger, runTest]);

  return useMemo(
    () => ({
      setup: {
        selectedEvent: context.node.eventLabel ?? null,
        onEventSelect: context.onEventSelect,
        selectedApp: {
          label: context.node.appLabel || "LeadConnector",
          icon: context.node.appIcon,
          color: context.node.appColor || "",
        },
        isTrigger: context.isTrigger,
      },
      configure: {
        data: context.node.config || {},
        onChange: (data: Record<string, unknown>, isValid: boolean) => {
          context.onFormDataChange({ ...data, _formIsValid: isValid });
        },
        webhookId: context.triggerWebhookId,
        isTrigger: context.isTrigger,
      },
      test: {
        data: sampleData ?? (context.isTrigger ? [] : context.node.config || {}),
        onSkipTest: context.onSkipTest,
        testStatus,
        isTrigger: context.isTrigger,
        onTestTrigger: runTest,
      },
      footer,
    }),
    [context, step, footer, sampleData, testStatus, runTest]
  );
}

export const leadConnectorIntegration: IntegrationDescriptor = {
  label: "LeadConnector",
  SetupStep: LeadConnectorSetupStep,
  ConfigureStep: LeadConnectorConfigureStep,
  TestStep: LeadConnectorTestStep,
  useStepProps: useLeadConnectorStepProps,
  lifecycle: {
    onSetupContinue: (node: { eventLabel?: string }) => {
      return !!node.eventLabel;
    },
  },
};
