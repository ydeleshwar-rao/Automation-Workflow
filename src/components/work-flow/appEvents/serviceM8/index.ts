"use client";

import { useMemo, useState, useCallback } from "react";
import { ServiceM8SetupStep } from "./components/setupServiceM8";
import { ServiceM8ConfigureStep } from "./components/configureServiceM8";
import { ServiceM8TestStep } from "./components/testServiceM8";
import type { IntegrationDescriptor, StepContext } from "../../uiOrchestrator/types";
import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";
import { useServiceM8Status } from "@/src/components/app-connections/servicem8/hooks/useServiceM8Status";
import axiosInstance from "@/src/services/apiClient";
import { SM8_EVENT_FIELDS } from "./components/configure/fields";

function useServiceM8StepProps(step: ConfigStep, context: StepContext) {
  const { connected } = useServiceM8Status();

  // Track polling subscription ID created during setup continue
  const [pollingSubId, setPollingSubId] = useState<string | null>(
    context.node.config?._pollingSubscriptionId ?? null
  );
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [sampleData, setSampleData] = useState<Record<string, any>[] | Record<string, any> | null>(null);

  // ── Test trigger handler ─────────────────────────────────────────────────
  const handleTestTrigger = useCallback(async () => {
    const isTrigger = context.isTrigger;
    const eventKey = context.node.eventLabel;
    if (!eventKey) {
      console.error("Missing event key");
      setTestStatus("failed");
      return;
    }

    setTestStatus("testing");

    // Strip {{map:id|label|value}} tokens → value (3rd segment).
    const resolveTokens = (v: unknown): unknown => {
      if (typeof v !== "string") return v;
      return v.replace(/\{\{map:[^|]*\|[^|]*\|([^}]*)\}\}/g, "$1").trim();
    };

    const rawConfig = context.node.config || {};
    const allowedKeys = new Set(
      (SM8_EVENT_FIELDS[eventKey] ?? []).map((f) => f.name)
    );
    const cleanConfig = Object.fromEntries(
      Object.entries(rawConfig).filter(
        ([k, v]) => allowedKeys.has(k) && v !== "" && v != null
      )
    );

    try {
      if (isTrigger) {
        const workflowId = context.node.workflowId;
        const nodeId = context.node.id;

        if (!workflowId || !nodeId) {
          console.error("Missing subscription fields:", { workflowId, nodeId });
          setTestStatus("failed");
          return;
        }

        const upsertRes = await axiosInstance.post(
          "/automation/polling/subscriptions",
          {
            workflow_id: workflowId,
            node_id: nodeId,
            integration_key: "service_m8",
            event_key: eventKey,
            config: cleanConfig,
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
        // Backend now returns `data` as an array (Zapier-style multi-sample preview).
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
        return;
      }

      // Action path — executes the action in ServiceM8 via the test-action endpoint.
      const input = Object.fromEntries(
        Object.entries(cleanConfig).map(([k, v]) => [k, resolveTokens(v)])
      );

      const actionRes = await axiosInstance.post(
        "/automation/workflows/test-action",
        {
          integration_key: "service_m8",
          action_key: eventKey,
          config: cleanConfig,
          input,
        }
      );

      const result = actionRes.data?.data;
      if (result) {
        setSampleData(result);
        setTestStatus("success");
      } else {
        setTestStatus("failed");
      }
    } catch (err) {
      console.error("Test trigger failed:", err);
      setTestStatus("failed");
    }
  }, [pollingSubId, context]);

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
        onChange: (data: any, isValid: boolean) => {
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
