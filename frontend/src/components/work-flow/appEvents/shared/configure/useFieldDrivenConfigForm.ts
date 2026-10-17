"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type UseFormGetValues, type UseFormSetValue } from "react-hook-form";

import type {
  IntegrationFieldDef,
  IntegrationFieldsByEvent,
  IntegrationOptionsByFieldName,
} from "./integrationField.types";
import { USER_EDIT_SET_VALUE_OPTIONS } from "./useVariablePicker";
import { hasSuggestedValue, isBlankFormValue, useWebhookAutoMap } from "./useWebhookAutoMap";
import { useReportFormValidity, type FormValues } from "./useReportFormValidity";

/** How auto-map suggestions from the trigger payload are applied to this integration's form. */
export interface AutoMapPolicy {
  /** False keeps dropdowns empty until the user picks — a fuzzy match could pre-select an id they never chose. */
  shouldAutoMapSelectFields: boolean;
  /** Events whose form must never be auto-filled. */
  skippedEvents?: ReadonlySet<string>;
  /** Select fields whose auto-mapped value must be one of the loaded options; otherwise the first option is used. */
  fieldsFallingBackToFirstOption?: readonly string[];
}

export interface FieldDrivenConfigFormOptions {
  data: FormValues;
  onChange: (data: FormValues, isValid: boolean) => void;
  selectedEvent?: string | null;
  triggerTestPayload?: unknown;
  fieldsByEvent: IntegrationFieldsByEvent;
  optionsByFieldName?: IntegrationOptionsByFieldName;
  autoMapPolicy: AutoMapPolicy;
}

const NO_FIELDS: IntegrationFieldDef[] = [];
const NO_OPTIONS_BY_FIELD_NAME: IntegrationOptionsByFieldName = {};
const SAVED_NULL_STRING = "null";

/** The selected event's fields, with runtime-loaded select options swapped in when available. */
function resolveEventFields(
  fieldsByEvent: IntegrationFieldsByEvent,
  selectedEvent: string | null | undefined,
  optionsByFieldName: IntegrationOptionsByFieldName
): IntegrationFieldDef[] {
  if (!selectedEvent) return NO_FIELDS;
  return (fieldsByEvent[selectedEvent] ?? NO_FIELDS).map((field) => {
    const loadedOptions = optionsByFieldName[field.name];
    if (field.type !== "select" || !loadedOptions || loadedOptions.length === 0) return field;
    return { ...field, options: loadedOptions };
  });
}

/** Saved select values of null / "null" become "" so the placeholder shows. */
function buildDefaultValues(data: FormValues, fields: IntegrationFieldDef[]): FormValues {
  const defaults: FormValues = { ...data };
  fields.forEach((field) => {
    const savedValue = defaults[field.name];
    if (field.type === "select" && (savedValue == null || savedValue === SAVED_NULL_STRING)) {
      defaults[field.name] = "";
    }
  });
  return defaults;
}

interface AutoMapWiring {
  fields: IntegrationFieldDef[];
  fieldNames: string[];
  selectedEvent?: string | null;
  triggerTestPayload: unknown;
  autoMapPolicy: AutoMapPolicy;
  getValues: UseFormGetValues<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}

function useApplyAutoMapSuggestions({
  fields,
  fieldNames,
  selectedEvent,
  triggerTestPayload,
  autoMapPolicy,
  getValues,
  setValue,
}: AutoMapWiring): void {
  const { isAutoMapped, suggestedValues, claimUnappliedPayload } = useWebhookAutoMap(fieldNames, triggerTestPayload);
  const { shouldAutoMapSelectFields, skippedEvents, fieldsFallingBackToFirstOption } = autoMapPolicy;
  const isEventSkipped = Boolean(selectedEvent && skippedEvents?.has(selectedEvent));

  useEffect(() => {
    if (isEventSkipped || !claimUnappliedPayload()) return;
    fields.forEach((field) => {
      if (field.type === "select" && !shouldAutoMapSelectFields) return;
      const suggestion = suggestedValues[field.name];
      if (!hasSuggestedValue(suggestion) || !isBlankFormValue(getValues(field.name))) return;
      setValue(field.name, String(suggestion), { shouldValidate: true, shouldDirty: false });
    });
  }, [isEventSkipped, claimUnappliedPayload, fields, shouldAutoMapSelectFields, suggestedValues, getValues, setValue]);

  useEffect(() => {
    if (!isAutoMapped) return;
    fieldsFallingBackToFirstOption?.forEach((fieldName) => {
      const suggestion = suggestedValues[fieldName];
      const options = fields.find((field) => field.name === fieldName)?.options ?? [];
      if (!hasSuggestedValue(suggestion) || options.length === 0) return;
      if (options.some((option) => option.value === String(suggestion))) return;
      setValue(fieldName, options[0].value);
    });
  }, [isAutoMapped, suggestedValues, fieldsFallingBackToFirstOption, fields, setValue]);
}

/**
 * Form state for a Configure step whose fields come from a static
 * event → fields map: defaults, auto-map from the trigger payload and
 * validity reporting to the parent.
 */
export function useFieldDrivenConfigForm({
  data,
  onChange,
  selectedEvent,
  triggerTestPayload,
  fieldsByEvent,
  optionsByFieldName = NO_OPTIONS_BY_FIELD_NAME,
  autoMapPolicy,
}: FieldDrivenConfigFormOptions) {
  const fields = useMemo(
    () => resolveEventFields(fieldsByEvent, selectedEvent, optionsByFieldName),
    [fieldsByEvent, selectedEvent, optionsByFieldName]
  );
  const fieldNames = useMemo(() => fields.map((field) => field.name), [fields]);

  // Lazy state: the form is seeded once from the saved config, like useForm itself.
  const [initialValues] = useState(() => buildDefaultValues(data, fields));
  const { watch, setValue, getValues } = useForm<FormValues>({ mode: "onChange", defaultValues: initialValues });
  const formValues = watch();

  useApplyAutoMapSuggestions({ fields, fieldNames, selectedEvent, triggerTestPayload, autoMapPolicy, getValues, setValue });
  useReportFormValidity(fields, formValues, onChange);

  const getFieldValue = useCallback((fieldName: string) => getValues(fieldName), [getValues]);
  const setFieldValue = useCallback(
    (fieldName: string, value: string) => setValue(fieldName, value, USER_EDIT_SET_VALUE_OPTIONS),
    [setValue]
  );

  return { fields, formValues, getFieldValue, setFieldValue };
}
