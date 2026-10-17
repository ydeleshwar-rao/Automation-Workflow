"use client";

import { useCallback } from "react";
import {
  CreatePollingSubscriptionPayload,
  PollNowResult,
  PollingSample,
  useCreatePollingSubscriptionMutation,
  usePollNowMutation,
} from "./workflowApi";

const NO_SAMPLES: PollingSample[] = [];

function toSampleList(result: PollNowResult | undefined): PollingSample[] {
  if (!result?.found || !result.data) return NO_SAMPLES;
  return Array.isArray(result.data) ? result.data : [result.data];
}

/**
 * Upserts the polling subscription of a trigger node, then asks the backend to
 * poll once so the builder can preview real records.
 *
 * `onSubscribed` runs before polling so the subscription id is persisted on the
 * node even when the poll itself fails.
 *
 * Resolves to the sample records (empty when nothing was found), or `null` when
 * the backend did not return a subscription id.
 */
export function usePollingTriggerSamples() {
  const [createPollingSubscription] = useCreatePollingSubscriptionMutation();
  const [pollNow] = usePollNowMutation();

  return useCallback(
    async (
      payload: CreatePollingSubscriptionPayload,
      onSubscribed: (subscriptionId: string) => void
    ): Promise<PollingSample[] | null> => {
      const subscription = await createPollingSubscription(payload).unwrap();
      const subscriptionId = subscription.data?.id;
      if (!subscriptionId) return null;

      onSubscribed(subscriptionId);
      const pollResponse = await pollNow(subscriptionId).unwrap();
      return toSampleList(pollResponse.data);
    },
    [createPollingSubscription, pollNow]
  );
}
