"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { autoMapFields } from "./autoMapper";

export function useAutoMap(
  fieldKeys: string[],
  webhookPayload: Record<string, unknown>
) {
  const keysSig = useMemo(() => fieldKeys.join("\u0001"), [fieldKeys]);
  const payloadStr = useMemo(() => JSON.stringify(webhookPayload ?? {}), [webhookPayload]);

  const [isAutoMapped, setIsAutoMapped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!fieldKeys?.length || !webhookPayload || Object.keys(webhookPayload).length === 0) {
      setIsAutoMapped(false);
      setFormValues({});
      setSnapshot({});
      setIsEditing(false);
      return;
    }

    try {
      const mapped = autoMapFields(fieldKeys, webhookPayload);
      setFormValues(mapped);
      setSnapshot(mapped);
      setIsAutoMapped(true);
      setIsEditing(false);
    } catch {
      setIsAutoMapped(false);
    }
  }, [keysSig, payloadStr]);

  const startEditing = useCallback(() => setIsEditing(true), []);

  const resetToAutoMapped = useCallback(
    (onApply?: (values: Record<string, unknown>) => void) => {
      const next = { ...snapshot };
      setFormValues(next);
      setIsEditing(false);
      onApply?.(next);
    },
    [snapshot]
  );

  const updateField = useCallback((key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    formValues,
    isAutoMapped,
    isEditing,
    startEditing,
    resetToAutoMapped,
    updateField,
  };
}
