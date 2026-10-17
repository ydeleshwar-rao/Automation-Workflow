"use client";

import React from "react";
import { WebhookVariablePicker } from "@/src/components/work-flow/components/WebhookVariablePicker";

import { ConfigureStepNotice } from "./ConfigureStepNotice";
import { IntegrationFieldRenderer } from "./IntegrationFieldRenderer";
import { formatSnakeCaseLabel } from "./fieldLabel";
import { useFieldDrivenConfigForm, type FieldDrivenConfigFormOptions } from "./useFieldDrivenConfigForm";
import { useVariablePicker } from "./useVariablePicker";

export interface FieldDrivenConfigureStepProps extends FieldDrivenConfigFormOptions {
  webhookId?: string;
  triggerTestSamples?: unknown[];
  /** When non-null, shown instead of the form (e.g. "connect your account first"). */
  connectionGate?: React.ReactNode;
}

/**
 * Configure step for integrations whose fields are a static event → fields map.
 * Each integration only supplies its fields map, runtime select options and auto-map policy.
 */
export function FieldDrivenConfigureStep({
  webhookId,
  triggerTestSamples,
  connectionGate,
  ...formOptions
}: FieldDrivenConfigureStepProps) {
  const { selectedEvent, triggerTestPayload } = formOptions;
  const { fields, formValues, getFieldValue, setFieldValue } = useFieldDrivenConfigForm(formOptions);
  const { openVariablePicker, pickerProps } = useVariablePicker({ getFieldValue, setFieldValue });

  if (connectionGate) return <>{connectionGate}</>;

  if (!selectedEvent) {
    return (
      <ConfigureStepNotice
        title="No action event selected"
        description="Go back to Setup and choose an action event first."
      />
    );
  }

  if (fields.length === 0) {
    return (
      <ConfigureStepNotice
        title="No fields for this event"
        description={<>Fields for &quot;{selectedEvent}&quot; have not been configured yet.</>}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <form className="space-y-6">
        {fields.map((field) => (
          <div key={field.name}>
            <IntegrationFieldRenderer
              field={field}
              value={formValues[field.name]}
              onChange={(value) => setFieldValue(field.name, value)}
              onPlusClick={(event) => openVariablePicker(event, field.name, formatSnakeCaseLabel(field.name))}
            />
          </div>
        ))}
      </form>

      <WebhookVariablePicker
        {...pickerProps}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
      />
    </div>
  );
}
