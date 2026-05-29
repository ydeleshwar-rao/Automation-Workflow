"use client";

import { useCallback, useMemo, useState } from "react";
import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";
import { LeadConnectorSetupStep } from "./components/setupLeadConnector";
import { LeadConnectorConfigureStep } from "./components/configureLeadConnector";
import { LeadConnectorTestStep } from "./components/testLeadConnector";
import type { IntegrationDescriptor, StepContext } from "../../uiOrchestrator/types";
import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";

/** Trigger event keys handled by the polling engine (integration_key = "leadshub") */
const POLLING_TRIGGER_EVENTS = new Set([
  "add_update_opportunity",
  "pipeline_stage_changed",
]);

/** Map action event keys to their backend test endpoints */
const ACTION_ENDPOINTS: Record<string, string> = {
  add_update_opportunity: API_ROUTES.GHL.TEST_ADD_UPDATE_OPPORTUNITY,
};

function useLeadConnectorStepProps(step: ConfigStep, context: StepContext) {
  const [pollingSubId, setPollingSubId] = useState<string | null>(
    context.node.config?._pollingSubscriptionId ?? null
  );
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [sampleData, setSampleData] = useState<Record<string, any>[] | null>(null);

  const runTest = useCallback(async () => {
    const config = context.node.config || {};
    const { _formIsValid, _pollingSubscriptionId, ...payload } = config;

    // eventLabel holds the action_key (see setupLeadConnector — onEventSelect passes id).
    const eventKey = context.node.eventLabel ?? "";

    // ── Trigger path: subscribe to polling, then poll-now to fetch samples ──
    if (context.isTrigger && POLLING_TRIGGER_EVENTS.has(eventKey)) {
      const workflowId = context.node.workflowId;
      const nodeId = context.node.id;

      if (!workflowId || !nodeId) {
        console.error("Missing subscription fields:", { workflowId, nodeId });
        setTestStatus("failed");
        return;
      }

      setTestStatus("testing");
      try {
        const upsertRes = await axiosInstance.post(
          "/automation/polling/subscriptions",
          {
            workflow_id: workflowId,
            node_id: nodeId,
            integration_key: "leadshub",
            event_key: eventKey,
            config: payload,
          }
        );

        const subId: string | undefined = upsertRes.data?.data?.id;
        if (!subId) {
          setTestStatus("failed");
          return;
        }

        if (subId !== pollingSubId) {
          setPollingSubId(subId);
          context.onFormDataChange({
            ...context.node.config,
            _pollingSubscriptionId: subId,
          });
        }

        const pollRes = await axiosInstance.post(
          `/automation/polling/subscriptions/${subId}/poll-now`,
          {}
        );

        const result = pollRes.data?.data;
        const samples: Record<string, any>[] = Array.isArray(result?.data)
          ? result.data
          : result?.data
          ? [result.data]
          : [];

        if (result?.found && samples.length > 0) {
          setSampleData(samples);
          setTestStatus("success");
          context.onFormDataChange({
            testPayload: samples[0],
            testSamples: samples,
          });
        } else {
          setTestStatus("failed");
        }
      } catch (err) {
        console.error("LeadsHub trigger test failed:", err);
        setTestStatus("failed");
      }
      return;
    }

    // ── Action path: hit the configured endpoint ──
    const endpoint = ACTION_ENDPOINTS[eventKey];
    if (!endpoint) {
      console.error(`No endpoint configured for LeadConnector action: ${eventKey}`);
      setTestStatus("failed");
      return;
    }

    setTestStatus("testing");
    try {
      const res = await axiosInstance.post(endpoint, payload);
      const result = res.data?.data ?? res.data;
      setSampleData(result ? [result] : null);
      setTestStatus("success");
    } catch (error) {
      console.error("LeadConnector action test failed:", error);
      setTestStatus("failed");
    }
  }, [context, pollingSubId]);

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
        onChange: (data: any, isValid: boolean) => {
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
