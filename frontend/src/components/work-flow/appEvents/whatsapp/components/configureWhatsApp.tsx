"use client";

import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { ConfigField, ConfigTextArea } from "@/src/components/work-flow/components/ChipTextField";
import { WebhookVariablePicker } from "@/src/components/work-flow/components/WebhookVariablePicker";
import { ConfigureStepNotice } from "../../shared/configure/ConfigureStepNotice";
import { areRequiredFieldsFilled } from "../../shared/configure/useReportFormValidity";
import { USER_EDIT_SET_VALUE_OPTIONS, useVariablePicker } from "../../shared/configure/useVariablePicker";

type WhatsAppConfig = {
  to?: string;
  message?: string;
  url?: string;
  caption?: string;
  filename?: string;
  mimetype?: string;
  templateName?: string;
  language?: string;
  lat?: string;
  lng?: string;
  name?: string;
  address?: string;
};

type WhatsAppFieldName = keyof WhatsAppConfig;

interface WhatsAppFieldConfig {
  name: WhatsAppFieldName;
  label: string;
  placeholder: string;
  required?: boolean;
  isMultiline?: boolean;
  /** Title of the variable picker when it differs from the field label. */
  pickerLabel?: string;
}

/** Only "send_*" events are actions with something to configure. */
const SEND_EVENT_PREFIX = "send_";
const DEFAULT_LANGUAGE = "en";

const RECIPIENT_FIELD: WhatsAppFieldConfig = {
  name: "to",
  label: "Recipient phone",
  placeholder: "919876543210",
  required: true,
};

const CAPTION_FIELD: WhatsAppFieldConfig = { name: "caption", label: "Caption", placeholder: "Optional caption" };

/** send_* event → fields in display order. `required` drives both the asterisk and validity. */
const WHATSAPP_FIELDS_BY_EVENT: Record<string, WhatsAppFieldConfig[]> = {
  send_text_message: [
    RECIPIENT_FIELD,
    { name: "message", label: "Message", placeholder: "Enter message or insert data...", required: true, isMultiline: true },
  ],
  send_template_message: [
    RECIPIENT_FIELD,
    {
      name: "message",
      label: "Template body",
      pickerLabel: "Message",
      placeholder: "Enter message or insert data...",
      required: true,
      isMultiline: true,
    },
    { name: "templateName", label: "Template name", placeholder: "appointment_reminder" },
    { name: "language", label: "Language", placeholder: DEFAULT_LANGUAGE },
  ],
  send_image: [
    RECIPIENT_FIELD,
    { name: "url", label: "Image URL", pickerLabel: "File URL", placeholder: "https://example.com/file.pdf", required: true },
    CAPTION_FIELD,
    { name: "mimetype", label: "MIME type", placeholder: "image/jpeg" },
  ],
  send_document: [
    RECIPIENT_FIELD,
    { name: "url", label: "Document/PDF URL", pickerLabel: "File URL", placeholder: "https://example.com/file.pdf", required: true },
    CAPTION_FIELD,
    { name: "filename", label: "Filename", placeholder: "invoice.pdf" },
    { name: "mimetype", label: "MIME type", placeholder: "application/pdf" },
  ],
  send_location: [
    RECIPIENT_FIELD,
    { name: "lat", label: "Latitude", placeholder: "28.6139", required: true },
    { name: "lng", label: "Longitude", placeholder: "77.2090", required: true },
    { name: "name", label: "Place name", placeholder: "Customer location" },
    { name: "address", label: "Address", placeholder: "Street, city" },
  ],
};

function buildDefaultValues(savedConfig: WhatsAppConfig): WhatsAppConfig {
  return {
    to: savedConfig.to ?? "",
    message: savedConfig.message ?? "",
    url: savedConfig.url ?? "",
    caption: savedConfig.caption ?? "",
    filename: savedConfig.filename ?? "",
    mimetype: savedConfig.mimetype ?? "",
    templateName: savedConfig.templateName ?? "",
    language: savedConfig.language ?? DEFAULT_LANGUAGE,
    lat: savedConfig.lat ?? "",
    lng: savedConfig.lng ?? "",
    name: savedConfig.name ?? "",
    address: savedConfig.address ?? "",
  };
}

/** Triggers need no setup; an unknown send_* event can never be valid. */
function isWhatsAppConfigValid(selectedEvent: string | null | undefined, values: WhatsAppConfig): boolean {
  if (!selectedEvent?.startsWith(SEND_EVENT_PREFIX)) return true;
  const eventFields = WHATSAPP_FIELDS_BY_EVENT[selectedEvent];
  return Boolean(eventFields) && areRequiredFieldsFilled(eventFields, values);
}

interface WhatsAppConfigureStepProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>, isValid: boolean) => void;
  webhookId?: string;
  selectedEvent?: string | null;
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
}

export function WhatsAppConfigureStep({
  data,
  onChange,
  webhookId,
  selectedEvent,
  triggerTestPayload,
  triggerTestSamples,
}: WhatsAppConfigureStepProps) {
  const { watch, setValue, getValues } = useForm<WhatsAppConfig>({
    mode: "onChange",
    defaultValues: buildDefaultValues(data as WhatsAppConfig),
  });
  const values = watch();
  const valuesKey = JSON.stringify(values);

  useEffect(() => {
    onChange(values, isWhatsAppConfigValid(selectedEvent, values));
  }, [selectedEvent, valuesKey, values, onChange]);

  const getFieldValue = useCallback((fieldName: WhatsAppFieldName) => getValues(fieldName), [getValues]);
  const setFieldValue = useCallback(
    (fieldName: WhatsAppFieldName, value: string) => setValue(fieldName, value, USER_EDIT_SET_VALUE_OPTIONS),
    [setValue]
  );
  const { openVariablePicker, pickerProps } = useVariablePicker({ getFieldValue, setFieldValue });

  if (!selectedEvent) {
    return (
      <ConfigureStepNotice
        title="No event selected"
        description="Go back to Setup and choose a WhatsApp event first."
      />
    );
  }

  if (!selectedEvent.startsWith(SEND_EVENT_PREFIX)) {
    return (
      <ConfigureStepNotice
        title="No extra setup needed"
        description="This WhatsApp trigger can continue to the test step."
      />
    );
  }

  const eventFields = WHATSAPP_FIELDS_BY_EVENT[selectedEvent] ?? [RECIPIENT_FIELD];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {eventFields.map((field) => {
        const TextInput = field.isMultiline ? ConfigTextArea : ConfigField;
        return (
          <TextInput
            key={field.name}
            label={field.label}
            required={field.required}
            value={values[field.name] ?? ""}
            onChange={(value) => setFieldValue(field.name, value)}
            onPlusClick={(event: React.MouseEvent) =>
              openVariablePicker(event, field.name, field.pickerLabel ?? field.label)
            }
            placeholder={field.placeholder}
          />
        );
      })}

      <WebhookVariablePicker
        {...pickerProps}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
      />
    </div>
  );
}
