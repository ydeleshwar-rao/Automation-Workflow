"use client";

import { useCallback, useMemo, useState } from "react";
import type { IntegrationDescriptor, StepContext } from "../../uiOrchestrator/types";
import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";
import { useWhatsAppStatus } from "@/src/components/app-connections/whatsapp/hooks/useWhatsAppStatus";
import {
  useSendWhatsAppDocumentMutation,
  useSendWhatsAppImageMutation,
  useSendWhatsAppLocationMutation,
  useSendWhatsAppTextMutation,
} from "./apiIntegrations/whatsappApi";
import { WhatsAppSetupStep } from "./components/setupWhatsApp";
import { WhatsAppConfigureStep } from "./components/configureWhatsApp";
import { WhatsAppTestStep } from "./components/testWhatsApp";

type TestStatus = "idle" | "testing" | "success" | "failed";
type SendMessage = (config: Record<string, unknown>, to: string) => Promise<unknown>;

const DEFAULT_SEND_EVENT = "send_text";

function resolveTokens(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{map:[^|]*\|[^|]*\|([^}]*)\}\}/g, "$1").trim();
}

/** Resolve a config field's map tokens into the plain string the send routes expect. */
function resolveField(config: Record<string, unknown>, fieldName: string): string {
  return String(resolveTokens(config[fieldName]) ?? "");
}

function buildSampleIncomingMessage() {
  return {
    from: "919876543210",
    message: "Sample incoming WhatsApp message",
    received_at: new Date().toISOString(),
  };
}

/** One sender per action event; unknown events fall back to a text message. */
function useWhatsAppSenders(): Record<string, SendMessage> {
  const [sendWhatsAppText] = useSendWhatsAppTextMutation();
  const [sendWhatsAppImage] = useSendWhatsAppImageMutation();
  const [sendWhatsAppDocument] = useSendWhatsAppDocumentMutation();
  const [sendWhatsAppLocation] = useSendWhatsAppLocationMutation();

  return useMemo(
    () => ({
      send_text: (config, to) =>
        sendWhatsAppText({ to, message: resolveField(config, "message") }).unwrap(),
      send_image: (config, to) =>
        sendWhatsAppImage({
          to,
          url: resolveField(config, "url"),
          caption: resolveField(config, "caption"),
          mimetype: resolveField(config, "mimetype"),
        }).unwrap(),
      send_document: (config, to) =>
        sendWhatsAppDocument({
          to,
          url: resolveField(config, "url"),
          filename: resolveField(config, "filename"),
          caption: resolveField(config, "caption"),
          mimetype: resolveField(config, "mimetype"),
        }).unwrap(),
      send_location: (config, to) =>
        sendWhatsAppLocation({
          to,
          lat: resolveField(config, "lat"),
          lng: resolveField(config, "lng"),
          name: resolveField(config, "name"),
          address: resolveField(config, "address"),
        }).unwrap(),
    }),
    [sendWhatsAppText, sendWhatsAppImage, sendWhatsAppDocument, sendWhatsAppLocation]
  );
}

function useWhatsAppStepProps(step: ConfigStep, context: StepContext) {
  const { connected } = useWhatsAppStatus();
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [sampleData, setSampleData] = useState<Record<string, unknown> | null>(null);
  const senders = useWhatsAppSenders();

  const handleTestTrigger = useCallback(async () => {
    setTestStatus("testing");
    try {
      if (context.isTrigger) {
        const sample = buildSampleIncomingMessage();
        setSampleData(sample);
        context.onFormDataChange({ ...context.node.config, testPayload: sample });
        setTestStatus("success");
        return;
      }

      const rawConfig = context.node.config || {};
      const to = resolveField(rawConfig, "to");
      const eventKey = context.node.eventLabel ?? DEFAULT_SEND_EVENT;
      const send = senders[eventKey] ?? senders[DEFAULT_SEND_EVENT];
      const result = await send(rawConfig, to);
      setSampleData((result as Record<string, unknown>) ?? { ...rawConfig, to });
      setTestStatus("success");
    } catch (error) {
      console.error("WhatsApp test failed:", error);
      setTestStatus("failed");
    }
  }, [context, senders]);

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
