"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { Input } from "@/src/components/ui/input";
import { WorkflowSection } from "@/src/components/work-flow/components/SectionWrapper";
import { flattenWebhookPayload } from "@/src/components/template/autoMapper";
import { useAutoMap } from "@/src/components/template/useAutoMap";

const CHILD_KEY_FIELD = "childKey";

interface WebhookConfigureStepProps {
  childKey: string;
  setChildKey: (val: string) => void;
  triggerTestPayload?: unknown;
}

export function WebhookConfigureStep({
  childKey,
  setChildKey,
  triggerTestPayload,
}: WebhookConfigureStepProps) {
  const fieldKeys = useMemo(() => [CHILD_KEY_FIELD], []);

  const webhookFlat = useMemo(() => {
    const raw = triggerTestPayload;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return flattenWebhookPayload(raw as Record<string, unknown>);
  }, [triggerTestPayload]);

  const cleanedFlat = Object.fromEntries(
    Object.entries(webhookFlat).map(([k, v]) => [
      k.replace(/^[\w-]+?__/, ""),
      v,
    ]),
  );

  const auto = useAutoMap(fieldKeys, cleanedFlat);
  const webhookPayloadKey = useMemo(() => JSON.stringify(webhookFlat), [webhookFlat]);
  const appliedPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auto.isAutoMapped) return;
    if (!webhookPayloadKey || webhookPayloadKey === "{}") return;
    if (appliedPayloadRef.current === webhookPayloadKey) return;
    appliedPayloadRef.current = webhookPayloadKey;

    const suggested = auto.formValues[CHILD_KEY_FIELD];
    if (suggested === undefined || suggested === null || String(suggested) === "") return;
    const curStr = (childKey ?? "").trim();
    if (curStr !== "") return;
    setChildKey(String(suggested));
  }, [
    webhookPayloadKey,
    auto.isAutoMapped,
    auto.formValues,
    childKey,
    setChildKey,
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <WorkflowSection label="Pick off a Child Key">
        <Input
          value={childKey}
          onChange={(e) => setChildKey(e.target.value)}
          placeholder="Enter text"
          className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all font-medium"
        />
      </WorkflowSection>
    </div>
  );
}
