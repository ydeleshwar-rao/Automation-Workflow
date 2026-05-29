/**
 * Webhook Integration — Registry Entry
 *
 * This file is the ONLY thing that needs to change when evolving the Webhook
 * integration.  `workflowView.tsx` and `registry.ts` are completely unaware
 * of these implementation details.
 */

import { WebhookSetupStep } from "./components/setupWebhook";
import { WebhookConfigureStep } from "./components/configureWebhook";
import { WebhookTestStep } from "./components/testWebhook";

import { useState, useMemo, useCallback } from "react";
import type { IntegrationDescriptor, WebhookTestStatus, WorkflowNodeData } from "../../uiOrchestrator/types";

import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";
import { useGetWebhookResponseQuery, useUpdateWebhookResponseMutation } from "./apiIntegrations/webhookApi";
import { parseRequestBodyFromWebhookRow } from "./apiIntegrations/parseWebhookRequestBody";
import { GetWebhookResponse } from "./apiIntegrations/types/webhookApis.type";
import { toast } from "sonner";

function resolveWebhookUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const isLocal5000 =
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      parsed.port === "5000";

    if (!isLocal5000) return trimmed;

    const candidateOrigins = [
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      typeof window !== "undefined" ? window.location.origin : undefined,
    ].filter((value): value is string => Boolean(value && value.trim()));

    for (const origin of candidateOrigins) {
      try {
        const base = new URL(origin);
        return new URL(parsed.pathname + parsed.search + parsed.hash, base.origin).toString();
      } catch {
        // Ignore invalid origin and try next candidate.
      }
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * useWebhookStepProps — provides all the extra props that the three Webhook
 * steps need, beyond the shared StepContext.
 *
 * Rules of Hooks apply: this is called unconditionally by WorkflowBuilder
 * when the Webhook integration is active.
 */



function useWebhookStepProps(
  step: ConfigStep,
  context: {
    node: WorkflowNodeData | undefined;
    onSkipTest: () => void;
    onFormDataChange: (data: any) => void;
  }
) {
  const [childKey, setChildKey] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const webhookUrl = resolveWebhookUrl(context.node?.config?.webhook?.full_url ?? "");
  const webhookId = context.node?.config?.webhook?.id ?? "";

  const { data: webhookData, isFetching, refetch } = useGetWebhookResponseQuery(webhookId, { skip: !webhookId });
  const [updateResponse] = useUpdateWebhookResponseMutation();
  const data = webhookData?.data;

  const handleFindNewRecords = useCallback(async () => {
    if (!webhookId) return;
    setHasFetched(true);
    await refetch();
  }, [webhookId, refetch]);

  const handleCopyUrl = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
  };

  const mappedRequests = Array.isArray(data)
    ? data.map((webhookData: GetWebhookResponse) => ({
        id: webhookData.id,
        name: "Webhook Request",
        timestamp: new Date().toISOString(),
        data: parseRequestBodyFromWebhookRow(webhookData),
      }))
    : [];

  const testStatus: WebhookTestStatus = isFetching
    ? "testing"
    : hasFetched && data
    ? "success"
    : "idle";

  const handleSaveData = useCallback(
    async (responseId: string, updatedBody: Record<string, any>) => {
      try {
        await updateResponse({
          responseId,
          payload: { request_body: updatedBody },
        });
        toast.success("Webhook response updated");
        // Refresh the list so the updated data is reflected
        await refetch();
      } catch {
        toast.error("Failed to update webhook response");
      }
    },
    [updateResponse, refetch]
  );

  // When a request is selected, persist its payload into the trigger node config
  // so downstream action nodes (e.g. mail) can read the real fields.
  const handleSelectRequest = useCallback(
    (id: string | null) => {
      setSelectedRequestId(id);
      if (id) {
        const request = mappedRequests.find((r) => r.id === id);
        if (request?.data) {
          context.onFormDataChange({ testPayload: request.data });
        }
      }
    },
    [mappedRequests, context]
  );

  // Footer per step. Test step exposes a "test-controls" layout so the sidebar
  // renders [Test trigger | Continue] at the bottom — wired to refetch webhook
  // responses (the webhook equivalent of "test trigger").
  const footer = useMemo(() => {
    if (step === "test") {
      return {
        layout: "test-controls" as const,
        onTestTrigger: handleFindNewRecords,
      };
    }
    return undefined;
  }, [step, handleFindNewRecords]);

  return useMemo(
    () => ({
      setup: {
        webhookCreated: !!webhookId,
      },

      configure: {
        childKey,
        setChildKey,
      },

      test: {
        webhookUrl,
        testStatus,
        requests: mappedRequests,
        selectedRequestId,
        onSelectRequest: handleSelectRequest,
        onFindNewRecords: handleFindNewRecords,
        onCopyUrl: handleCopyUrl,
        onSkipTest: context.onSkipTest,
        onSaveData: handleSaveData,
      },
      footer,
    }),
    [
      childKey,
      webhookUrl,
      testStatus,
      data,
      selectedRequestId,
      handleSelectRequest,
      handleFindNewRecords,
      context.onSkipTest,
      handleSaveData,
      footer,
      webhookId,
      mappedRequests,
      handleCopyUrl,
    ]
  );
}


export const webhookIntegration: IntegrationDescriptor = {
  label: "Webhooks",
  SetupStep: WebhookSetupStep,
  ConfigureStep: WebhookConfigureStep,
  TestStep: WebhookTestStep,
  useStepProps: useWebhookStepProps,

  lifecycle: {
    onSetupContinue: (node) => {
      return !!node.eventLabel;
    },
    onTestContinue: (node) => {
      // Only allow Continue once the user has explicitly selected a webhook request
      // (handleSelectRequest stores the payload under config.testPayload)
      return !!node.config?.testPayload;
    },
  },
};