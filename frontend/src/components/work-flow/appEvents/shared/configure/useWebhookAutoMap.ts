"use client";

import { useCallback, useMemo, useRef } from "react";
import { flattenWebhookPayload } from "@/src/components/template/autoMapper";
import { useAutoMap } from "@/src/components/template/useAutoMap";

/** Flattened keys are prefixed with their source node ("<node>__key"); matching ignores it. */
const SOURCE_PREFIX_PATTERN = /^[\w-]+?__/;
const EMPTY_PAYLOAD_KEY = "{}";

function flattenTriggerPayload(triggerTestPayload: unknown): Record<string, unknown> {
  if (!triggerTestPayload || typeof triggerTestPayload !== "object" || Array.isArray(triggerTestPayload)) {
    return {};
  }
  return flattenWebhookPayload(triggerTestPayload as Record<string, unknown>);
}

function stripSourcePrefixes(flatPayload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(flatPayload).map(([key, value]) => [key.replace(SOURCE_PREFIX_PATTERN, ""), value])
  );
}

/** True when a form value has nothing the user typed (so a suggestion may fill it). */
export function isBlankFormValue(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === "";
}

/** True when an auto-map suggestion has something worth applying. */
export function hasSuggestedValue(suggestion: unknown): boolean {
  return suggestion !== undefined && suggestion !== null && String(suggestion) !== "";
}

/**
 * Auto-map the Configure fields against the trigger's test payload.
 * `claimUnappliedPayload` returns true exactly once per new non-empty payload,
 * so suggestions are applied once and never overwrite later user edits.
 */
export function useWebhookAutoMap(fieldNames: string[], triggerTestPayload: unknown) {
  const { flatPayloadKey, cleanedPayload } = useMemo(() => {
    const flatPayload = flattenTriggerPayload(triggerTestPayload);
    return { flatPayloadKey: JSON.stringify(flatPayload), cleanedPayload: stripSourcePrefixes(flatPayload) };
  }, [triggerTestPayload]);

  const autoMap = useAutoMap(fieldNames, cleanedPayload);
  const { isAutoMapped } = autoMap;
  const appliedPayloadKeyRef = useRef<string | null>(null);

  const claimUnappliedPayload = useCallback((): boolean => {
    if (!isAutoMapped) return false;
    if (!flatPayloadKey || flatPayloadKey === EMPTY_PAYLOAD_KEY) return false;
    if (appliedPayloadKeyRef.current === flatPayloadKey) return false;
    appliedPayloadKeyRef.current = flatPayloadKey;
    return true;
  }, [isAutoMapped, flatPayloadKey]);

  return {
    isAutoMapped,
    suggestedValues: autoMap.formValues,
    cleanedPayload,
    claimUnappliedPayload,
  };
}
