"use client";

import { useCallback, useMemo, useState } from "react";
import axiosInstance from "@/src/services/apiClient";
import { getActiveClientKey } from "@/src/store/localStorage";
import { CommusoftSetupStep } from "./components/setupCommusoft";
import { CommusoftConfigureStep } from "./components/configureCommusoft";
import { CommusoftTestStep } from "./components/testCommusoft";
import type { IntegrationDescriptor, StepContext } from "../../uiOrchestrator/types";
import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";
import { API_ROUTES } from "@/src/constants/api.constants";
import { useCommusoftStatus } from "@/src/components/app-connections/commusoft/hooks/useCommusoftStatus";

/** Map action event keys to their backend endpoints */
const ACTION_ENDPOINTS: Record<string, string> = {
  create_client: API_ROUTES.COMMUSOFT.CREATE_CUSTOMER,
};

/** Trigger event keys handled by the polling engine (integration_key = "commusoft") */
const POLLING_TRIGGER_EVENTS = new Set([
  "job_completed",
  "job_closed",
  "new_client",
  "new_job",
]);

function useCommusoftStepProps(step: ConfigStep, context: StepContext) {
  const { connected } = useCommusoftStatus();

  const [pollingSubId, setPollingSubId] = useState<string | null>(
    context.node.config?._pollingSubscriptionId ?? null
  );
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [sampleData, setSampleData] = useState<Record<string, any>[] | null>(null);

  const runTest = useCallback(async () => {
    const config = context.node.config || {};
    const { _formIsValid, _pollingSubscriptionId, ...payload } = config;

    const eventKey =
      context.node.eventLabel?.toLowerCase().replace(/\s+/g, "_") ?? "";

    const clientkey = getActiveClientKey();

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
            integration_key: "commusoft",
            event_key: eventKey,
            config: payload,
          },
          { headers: { clientkey } }
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
          {},
          { headers: { clientkey } }
        );

        const result = pollRes.data?.data;
        // Backend returns `data` as an array (Zapier-style multi-sample preview).
        const samples: Record<string, any>[] = Array.isArray(result?.data)
          ? result.data
          : result?.data
          ? [result.data]
          : [];

        if (result?.found && samples.length > 0) {
          setSampleData(samples);
          setTestStatus("success");
          // Persist first sample for flat variable picker, full list for multi-record picker.
          context.onFormDataChange({
            testPayload: samples[0],
            testSamples: samples,
          });
        } else {
          setTestStatus("failed");
        }
      } catch (err) {
        console.error("Commusoft trigger test failed:", err);
        setTestStatus("failed");
      }
      return;
    }

    // ── Action path: hit the configured endpoint ──
    const endpoint = ACTION_ENDPOINTS[eventKey];
    if (!endpoint) {
      console.error(`No endpoint configured for action: ${eventKey}`);
      setTestStatus("failed");
      return;
    }

    setTestStatus("testing");
    try {
      await axiosInstance.post(endpoint, payload, {
        headers: { clientkey },
      });
      setTestStatus("success");
    } catch (error) {
      console.error("Commusoft test trigger failed:", error);
      setTestStatus("failed");
    }
  }, [context, pollingSubId]);

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
        onChange: (data: any, isValid: boolean) => {
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
