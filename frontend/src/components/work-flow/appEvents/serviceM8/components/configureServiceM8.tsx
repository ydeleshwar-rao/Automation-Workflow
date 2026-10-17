"use client";

import { useMemo } from "react";

import { FieldDrivenConfigureStep } from "../../shared/configure/FieldDrivenConfigureStep";
import type { AutoMapPolicy } from "../../shared/configure/useFieldDrivenConfigForm";
import {
  doesEventHaveField,
  type IntegrationOptionsByFieldName,
} from "../../shared/configure/integrationField.types";
import {
  useGetServiceM8CategoryOptionsQuery,
  useGetServiceM8QueueOptionsQuery,
  ServiceM8SelectOption,
} from "../apiIntegrations/serviceM8Api";
import { SM8_EVENT_FIELDS } from "./configure/fields";

const QUEUE_FIELD_NAME = "queue_uuid";
const CATEGORY_FIELD_NAME = "category_uuid";
const NO_SELECT_OPTIONS: ServiceM8SelectOption[] = [];

const SERVICE_M8_AUTO_MAP_POLICY: AutoMapPolicy = {
  // Dropdowns hold ServiceM8 UUIDs — auto-mapping free text would pre-select one the user never chose.
  shouldAutoMapSelectFields: false,
  skippedEvents: new Set(["create_client"]),
};

interface ServiceM8ConfigureStepProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>, isValid: boolean) => void;
  webhookId?: string;
  selectedEvent?: string | null;
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
}

export function ServiceM8ConfigureStep(props: ServiceM8ConfigureStepProps) {
  const { selectedEvent } = props;
  // Only load a list when the selected event's form actually has that picker.
  const needsQueues = doesEventHaveField(SM8_EVENT_FIELDS, selectedEvent, QUEUE_FIELD_NAME);
  const needsCategories = doesEventHaveField(SM8_EVENT_FIELDS, selectedEvent, CATEGORY_FIELD_NAME);

  const { data: queueOptions = NO_SELECT_OPTIONS } = useGetServiceM8QueueOptionsQuery(undefined, {
    skip: !needsQueues,
  });
  const { data: categoryOptions = NO_SELECT_OPTIONS } = useGetServiceM8CategoryOptionsQuery(undefined, {
    skip: !needsCategories,
  });

  const optionsByFieldName: IntegrationOptionsByFieldName = useMemo(
    () => ({ [QUEUE_FIELD_NAME]: queueOptions, [CATEGORY_FIELD_NAME]: categoryOptions }),
    [queueOptions, categoryOptions]
  );

  return (
    <FieldDrivenConfigureStep
      {...props}
      fieldsByEvent={SM8_EVENT_FIELDS}
      optionsByFieldName={optionsByFieldName}
      autoMapPolicy={SERVICE_M8_AUTO_MAP_POLICY}
    />
  );
}
