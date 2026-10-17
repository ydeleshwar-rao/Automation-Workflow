"use client";

import { useMemo, useState, useCallback } from "react";
import { ServiceM8SetupStep } from "./components/setupServiceM8";
import { ServiceM8ConfigureStep } from "./components/configureServiceM8";
import { ServiceM8TestStep } from "./components/testServiceM8";
import type { IntegrationDescriptor, StepContext } from "../../uiOrchestrator/types";
import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";
import { useServiceM8Status } from "@/src/components/app-connections/servicem8/hooks/useServiceM8Status";
import { SM8_EVENT_FIELDS } from "./components/configure/fields";
import { usePollingTriggerSamples } from "../../apiIntegrations/usePollingTriggerSamples";
import { PollingSample, useTestActionMutation } from "../../apiIntegrations/workflowApi";

const SERVICE_M8_INTEGRATION_KEY = "service_m8";

type TestStatus = "idle" | "testing" | "success" | "failed";

/** Strip {{map:id|label|value}} tokens → value (3rd segment). */
function resolveTokens(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{map:[^|]*\|[^|]*\|([^}]*)\}\}/g, "$1").trim();
}

/** Keep only the non-empty fields the selected event actually declares. */
function buildEventConfig(eventKey: string, rawConfig: Record<string, unknown>): Record<string, unknown> {
  const allowedKeys = new Set((SM8_EVENT_FIELDS[eventKey] ?? []).map((field) => field.name));
  return Object.fromEntries(
    Object.entries(rawConfig).filter(
      ([key, value]) => allowedKeys.has(key) && value !== "" && value != null
    )
  );
}

function useServiceM8StepProps(step: ConfigStep, context: StepContext) {
  const { connected } = useServiceM8Status();

  // Track polling subscription ID created during setup continue
  const [pollingSubscriptionId, setPollingSubscriptionId] = useState<string | null>(
    context.node.config?._pollingSubscriptionId ?? null
  );
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [sampleData, setSampleData] = useState<PollingSample[] | PollingSample | null>(null);

  const fetchPollingSamples = usePollingTriggerSamples();
  const [testAction] = useTestActionMutation();

  const runTriggerTest = useCallback(
    async (eventKey: string, eventConfig: Record<string, unknown>) => {
      const workflowId = context.node.workflowId;
      const nodeId = context.node.id;
      if (!workflowId || !nodeId) {
        console.error("Missing subscription fields:", { workflowId, nodeId });
        setTestStatus("failed");
        return;
      }

      const samples = await fetchPollingSamples(
        {
          workflow_id: workflowId,
          node_id: nodeId,
          integration_key: SERVICE_M8_INTEGRATION_KEY,
          event_key: eventKey,
          config: eventConfig,
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
    },
    [context, fetchPollingSamples, pollingSubscriptionId]
  );

  /** Executes the action in ServiceM8 via the test-action endpoint. */
  const runActionTest = useCallback(
    async (eventKey: string, eventConfig: Record<string, unknown>) => {
      const input = Object.fromEntries(
        Object.entries(eventConfig).map(([key, value]) => [key, resolveTokens(value)])
      );
      const response = await testAction({
        integration_key: SERVICE_M8_INTEGRATION_KEY,
        action_key: eventKey,
        config: eventConfig,
        input,
      }).unwrap();

      if (!response.data) {
        setTestStatus("failed");
        return;
      }
      setSampleData(response.data);
      setTestStatus("success");
    },
    [testAction]
  );

  // ── Test trigger handler ─────────────────────────────────────────────────
  const handleTestTrigger = useCallback(async () => {
    const eventKey = context.node.eventLabel;
    if (!eventKey) {
      console.error("Missing event key");
      setTestStatus("failed");
      return;
    }

    setTestStatus("testing");
    const eventConfig = buildEventConfig(eventKey, context.node.config || {});
    try {
      if (context.isTrigger) {
        await runTriggerTest(eventKey, eventConfig);
        return;
      }
      await runActionTest(eventKey, eventConfig);
    } catch (error) {
      console.error("Test trigger failed:", error);
      setTestStatus("failed");
    }
  }, [context.node.eventLabel, context.node.config, context.isTrigger, runTriggerTest, runActionTest]);

  // ── Footer config per step ───────────────────────────────────────────────
  const footer = useMemo(() => {
    if (step === "setup") {
      if (!connected) {
        return {
          label: "Connect ServiceM8 to continue",
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
      // For triggers, configure is optional filter — always allow continue
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
        onTestTrigger: handleTestTrigger,
      };
    }
    return undefined;
  }, [step, connected, context.node.eventLabel, context.node.config?._formIsValid, context.isTrigger, handleTestTrigger]);

  // ── Props per step ───────────────────────────────────────────────────────
  return useMemo(
    () => ({
      setup: {
        selectedEvent: context.node.eventLabel ?? null,
        onEventSelect: context.onEventSelect,
        selectedApp: {
          label: context.node.appLabel || "ServiceM8",
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
        selectedEvent: context.node.eventLabel ?? null,
        isTrigger: context.isTrigger,
      },
      test: {
        data: sampleData || context.node.config || {},
        testStatus,
        onSkipTest: context.onSkipTest,
        isTrigger: context.isTrigger,
        onTestTrigger: handleTestTrigger,
      },
      footer,
    }),
    [context, step, footer, sampleData, testStatus, handleTestTrigger]
  );
}

export const serviceM8Integration: IntegrationDescriptor = {
  label: "ServiceM8",
  SetupStep: ServiceM8SetupStep,
  ConfigureStep: ServiceM8ConfigureStep,
  TestStep: ServiceM8TestStep,
  useStepProps: useServiceM8StepProps,
  lifecycle: {
    onSetupContinue: (node: { eventLabel?: string }) => {
      return !!node.eventLabel;
    },
  },
};
