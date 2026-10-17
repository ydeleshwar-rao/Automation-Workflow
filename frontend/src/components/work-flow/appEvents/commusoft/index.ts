"use client";

import { useCallback, useMemo, useState } from "react";
import { CommusoftSetupStep } from "./components/setupCommusoft";
import { CommusoftConfigureStep } from "./components/configureCommusoft";
import { CommusoftTestStep } from "./components/testCommusoft";
import type { IntegrationDescriptor, StepContext } from "../../uiOrchestrator/types";
import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";
import { useCommusoftStatus } from "@/src/components/app-connections/commusoft/hooks/useCommusoftStatus";
import { usePollingTriggerSamples } from "../../apiIntegrations/usePollingTriggerSamples";
import { stripInternalConfigKeys } from "../../apiIntegrations/nodeConfig.utils";
import type { PollingSample } from "../../apiIntegrations/workflowApi";
import { useCreateCommusoftCustomerMutation } from "./apiIntegrations/commusoftApi";

const COMMUSOFT_INTEGRATION_KEY = "commusoft";

/** Trigger event keys handled by the polling engine (integration_key = "commusoft") */
const POLLING_TRIGGER_EVENTS = new Set([
  "job_completed",
  "job_closed",
  "new_client",
  "new_job",
]);

type TestStatus = "idle" | "testing" | "success" | "failed";
type ActionTestRunner = (payload: Record<string, unknown>) => Promise<unknown>;

function useCommusoftStepProps(step: ConfigStep, context: StepContext) {
  const { connected } = useCommusoftStatus();
  const [pollingSubscriptionId, setPollingSubscriptionId] = useState<string | null>(
    context.node.config?._pollingSubscriptionId ?? null
  );
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [sampleData, setSampleData] = useState<PollingSample[] | null>(null);

  const fetchPollingSamples = usePollingTriggerSamples();
  const [createCommusoftCustomer] = useCreateCommusoftCustomerMutation();

  /** Action event keys mapped to the backend call that runs them. */
  const actionTestRunners = useMemo<Record<string, ActionTestRunner>>(
    () => ({
      create_client: (payload) => createCommusoftCustomer(payload).unwrap(),
    }),
    [createCommusoftCustomer]
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
            integration_key: COMMUSOFT_INTEGRATION_KEY,
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
        // Persist first sample for flat variable picker, full list for multi-record picker.
        context.onFormDataChange({ testPayload: samples[0], testSamples: samples });
      } catch (error) {
        console.error("Commusoft trigger test failed:", error);
        setTestStatus("failed");
      }
    },
    [context, fetchPollingSamples, pollingSubscriptionId]
  );

  const runActionTest = useCallback(
    async (eventKey: string, payload: Record<string, unknown>) => {
      const runActionTestCall = actionTestRunners[eventKey];
      if (!runActionTestCall) {
        console.error(`No endpoint configured for action: ${eventKey}`);
        setTestStatus("failed");
        return;
      }

      setTestStatus("testing");
      try {
        await runActionTestCall(payload);
        setTestStatus("success");
      } catch (error) {
        console.error("Commusoft test trigger failed:", error);
        setTestStatus("failed");
      }
    },
    [actionTestRunners]
  );

  const runTest = useCallback(async () => {
    const payload = stripInternalConfigKeys(context.node.config || {});
    const eventKey = context.node.eventLabel?.toLowerCase().replace(/\s+/g, "_") ?? "";

    if (context.isTrigger && POLLING_TRIGGER_EVENTS.has(eventKey)) {
      await runTriggerTest(eventKey, payload);
      return;
    }
    await runActionTest(eventKey, payload);
  }, [context.node.config, context.node.eventLabel, context.isTrigger, runTriggerTest, runActionTest]);

  const footer = useMemo(() => {
    if (step === "setup") {
      if (!connected) {
        return {
          label: "Connect Commusoft to continue",
          disabled: true,
        };
      }
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
  }, [
    step,
    connected,
    context.node.eventLabel,
    context.node.config?._formIsValid,
    context.isTrigger,
    runTest,
  ]);

  return useMemo(
    () => ({
      setup: {
        selectedEvent: context.node.eventLabel ?? null,
        onEventSelect: context.onEventSelect,
        selectedApp: {
          label: context.node.appLabel || "Commusoft",
          icon: context.node.appIcon,
          color: context.node.appColor || "",
        },
        isTrigger: context.isTrigger,
        onChangeApp: context.onChangeApp,
      },
      configure: {
        data: context.node.config || {},
        onChange: (data: Record<string, unknown>, isValid: boolean) => {
          context.onFormDataChange({ ...data, _formIsValid: isValid });
        },
        webhookId: context.triggerWebhookId,
        selectedEvent: context.node.eventLabel ?? null,
        isTrigger: context.isTrigger,
      },
      test: {
        // For triggers, prefer the live sample array; for actions, fall back to the form config.
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

export const commusoftIntegration: IntegrationDescriptor = {
  label: "Commusoft",
  SetupStep: CommusoftSetupStep,
  ConfigureStep: CommusoftConfigureStep,
  TestStep: CommusoftTestStep,
  useStepProps: useCommusoftStepProps,
  lifecycle: {
    onSetupContinue: (node: { eventLabel?: string }) => {
      return !!node.eventLabel;
    },
  },
};
