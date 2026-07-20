"use client";

import { useCallback, useMemo, useState } from "react";
import type { IntegrationDescriptor, StepContext } from "../../uiOrchestrator/types";
import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";
import { useWhatsAppStatus } from "@/src/components/app-connections/whatsapp/hooks/useWhatsAppStatus";
import {
  sendWhatsAppDocument,
  sendWhatsAppImage,
  sendWhatsAppLocation,
  sendWhatsAppText,
} from "@/src/components/app-connections/whatsapp/api/whatsapp.api";
import { WhatsAppSetupStep } from "./components/setupWhatsApp";
import { WhatsAppConfigureStep } from "./components/configureWhatsApp";
import { WhatsAppTestStep } from "./components/testWhatsApp";

function resolveTokens(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{map:[^|]*\|[^|]*\|([^}]*)\}\}/g, "$1").trim();
}

function useWhatsAppStepProps(step: ConfigStep, context: StepContext) {
  const { connected } = useWhatsAppStatus();
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [sampleData, setSampleData] = useState<Record<string, unknown> | null>(null);

  const handleTestTrigger = useCallback(async () => {
    setTestStatus("testing");
    try {
      if (context.isTrigger) {
        const sample = {
          from: "919876543210",
          message: "Sample incoming WhatsApp message",
          received_at: new Date().toISOString(),
        };
        setSampleData(sample);
        context.onFormDataChange({ ...context.node.config, testPayload: sample });
        setTestStatus("success");
        return;
      }

      const rawConfig = context.node.config || {};
      const to = String(resolveTokens(rawConfig.to) ?? "");
      const eventKey = context.node.eventLabel;
      const previewPayload = { ...rawConfig, to };
      let result: unknown;

      if (eventKey === "send_image") {
        result = await sendWhatsAppImage({
          to,
          url: String(resolveTokens(rawConfig.url) ?? ""),
          caption: String(resolveTokens(rawConfig.caption) ?? ""),
          mimetype: String(resolveTokens(rawConfig.mimetype) ?? ""),
        });
      } else if (eventKey === "send_document") {
        result = await sendWhatsAppDocument({
          to,
          url: String(resolveTokens(rawConfig.url) ?? ""),
          filename: String(resolveTokens(rawConfig.filename) ?? ""),
          caption: String(resolveTokens(rawConfig.caption) ?? ""),
          mimetype: String(resolveTokens(rawConfig.mimetype) ?? ""),
        });
      } else if (eventKey === "send_location") {
        result = await sendWhatsAppLocation({
          to,
          lat: String(resolveTokens(rawConfig.lat) ?? ""),
          lng: String(resolveTokens(rawConfig.lng) ?? ""),
          name: String(resolveTokens(rawConfig.name) ?? ""),
          address: String(resolveTokens(rawConfig.address) ?? ""),
        });
      } else {
        const payload = {
          to,
          message: String(resolveTokens(rawConfig.message) ?? ""),
        };
        result = await sendWhatsAppText(payload);
      }
      setSampleData((result as Record<string, unknown>) ?? previewPayload);
      setTestStatus("success");
    } catch (err) {
      console.error("WhatsApp test failed:", err);
      setTestStatus("failed");
    }
  }, [context]);

  const footer = useMemo(() => {
    if (step === "setup") {
      if (!connected) return { label: "Connect WhatsApp to continue", disabled: true };
      if (!context.node.eventLabel) return { label: "To continue, choose an event", disabled: true };
      return { label: "Continue", disabled: false, variant: "orange" as const };
    }
    if (step === "configure") {
      if (context.isTrigger) return { label: "Continue", disabled: false, variant: "orange" as const };
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

  return useMemo(
    () => ({
      setup: {
        selectedEvent: context.node.eventLabel ?? null,
        onEventSelect: context.onEventSelect,
        selectedApp: {
          label: context.node.appLabel || "WhatsApp",
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
        triggerTestPayload: context.triggerTestPayload,
        triggerTestSamples: context.triggerTestSamples,
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
    [context, footer, sampleData, testStatus, handleTestTrigger]
  );
}

export const whatsappIntegration: IntegrationDescriptor = {
  label: "WhatsApp",
  SetupStep: WhatsAppSetupStep,
  ConfigureStep: WhatsAppConfigureStep,
  TestStep: WhatsAppTestStep,
  useStepProps: useWhatsAppStepProps,
  lifecycle: {
    onSetupContinue: (node: { eventLabel?: string }) => !!node.eventLabel,
  },
};
