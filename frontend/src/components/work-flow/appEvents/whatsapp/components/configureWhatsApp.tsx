"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ConfigField, ConfigTextArea } from "@/src/components/work-flow/components/ChipTextField";
import {
  WebhookVariablePicker,
  VariableField,
} from "@/src/components/work-flow/components/WebhookVariablePicker";

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
  const initial = data as WhatsAppConfig;
  const { watch, setValue, getValues } = useForm<WhatsAppConfig>({
    mode: "onChange",
    defaultValues: {
      to: initial.to ?? "",
      message: initial.message ?? "",
      url: initial.url ?? "",
      caption: initial.caption ?? "",
      filename: initial.filename ?? "",
      mimetype: initial.mimetype ?? "",
      templateName: initial.templateName ?? "",
      language: initial.language ?? "en",
      lat: initial.lat ?? "",
      lng: initial.lng ?? "",
      name: initial.name ?? "",
      address: initial.address ?? "",
    },
  });
  const values = watch();
  const valuesKey = JSON.stringify(values);
  const activeFieldRef = useRef<keyof WhatsAppConfig | null>(null);
  const [popupState, setPopupState] = useState({
    isOpen: false,
    fieldLabel: "",
    position: { top: 0, right: 0 },
  });

  const requiresTo = selectedEvent?.startsWith("send_");

  useEffect(() => {
    if (!requiresTo) {
      onChange(values, true);
      return;
    }
    const isValid =
      Boolean(values.to) &&
      (
        (selectedEvent === "send_text_message" && Boolean(values.message)) ||
        (selectedEvent === "send_image" && Boolean(values.url)) ||
        (selectedEvent === "send_document" && Boolean(values.url)) ||
        (selectedEvent === "send_template_message" && Boolean(values.message)) ||
        (selectedEvent === "send_location" && Boolean(values.lat) && Boolean(values.lng))
      );
    onChange(values, isValid);
  }, [requiresTo, selectedEvent, valuesKey, values, onChange]);

  const openVariablePicker = useCallback((event: React.MouseEvent, field: keyof WhatsAppConfig, label: string) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    activeFieldRef.current = field;
    setPopupState({
      isOpen: true,
      fieldLabel: label,
      position: { top: rect.top, right: window.innerWidth - rect.left + 10 },
    });
  }, []);

  const onSelectVariable = useCallback(
    (variable: VariableField) => {
      const field = activeFieldRef.current;
      if (!field) return;
      const current = getValues(field) || "";
      const token = `{{map:${variable.id}|${variable.label}|${variable.description}}}`;
      setValue(field, `${current}${token}`, { shouldValidate: true, shouldDirty: true });
      setPopupState((prev) => ({ ...prev, isOpen: false }));
    },
    [getValues, setValue]
  );

  const emptyState = useMemo(() => {
    if (selectedEvent) return null;
    return "Go back to Setup and choose a WhatsApp event first.";
  }, [selectedEvent]);

  if (emptyState) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
        <p className="text-sm font-bold text-foreground">No event selected</p>
        <p className="text-xs text-muted-foreground">{emptyState}</p>
      </div>
    );
  }

  if (!requiresTo) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
        <p className="text-sm font-bold text-foreground">No extra setup needed</p>
        <p className="text-xs text-muted-foreground">This WhatsApp trigger can continue to the test step.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <ConfigField
        label="Recipient phone"
        required
        value={values.to ?? ""}
        onChange={(value) => setValue("to", value, { shouldValidate: true, shouldDirty: true })}
        onPlusClick={(event) => openVariablePicker(event, "to", "Recipient phone")}
        placeholder="919876543210"
      />

      {(selectedEvent === "send_text_message" || selectedEvent === "send_template_message") && (
        <ConfigTextArea
          label={selectedEvent === "send_template_message" ? "Template body" : "Message"}
          required
          value={values.message ?? ""}
          onChange={(value) => setValue("message", value, { shouldValidate: true, shouldDirty: true })}
          onPlusClick={(event) => openVariablePicker(event, "message", "Message")}
          placeholder="Enter message or insert data..."
        />
      )}

      {selectedEvent === "send_template_message" && (
        <>
          <ConfigField
            label="Template name"
            value={values.templateName ?? ""}
            onChange={(value) => setValue("templateName", value, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(event) => openVariablePicker(event, "templateName", "Template name")}
            placeholder="appointment_reminder"
          />
          <ConfigField
            label="Language"
            value={values.language ?? ""}
            onChange={(value) => setValue("language", value, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(event) => openVariablePicker(event, "language", "Language")}
            placeholder="en"
          />
        </>
      )}

      {(selectedEvent === "send_image" || selectedEvent === "send_document") && (
        <>
          <ConfigField
            label={selectedEvent === "send_image" ? "Image URL" : "Document/PDF URL"}
            required
            value={values.url ?? ""}
            onChange={(value) => setValue("url", value, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(event) => openVariablePicker(event, "url", "File URL")}
            placeholder="https://example.com/file.pdf"
          />
          <ConfigField
            label="Caption"
            value={values.caption ?? ""}
            onChange={(value) => setValue("caption", value, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(event) => openVariablePicker(event, "caption", "Caption")}
            placeholder="Optional caption"
          />
          {selectedEvent === "send_document" && (
            <ConfigField
              label="Filename"
              value={values.filename ?? ""}
              onChange={(value) => setValue("filename", value, { shouldValidate: true, shouldDirty: true })}
              onPlusClick={(event) => openVariablePicker(event, "filename", "Filename")}
              placeholder="invoice.pdf"
            />
          )}
          <ConfigField
            label="MIME type"
            value={values.mimetype ?? ""}
            onChange={(value) => setValue("mimetype", value, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(event) => openVariablePicker(event, "mimetype", "MIME type")}
            placeholder={selectedEvent === "send_image" ? "image/jpeg" : "application/pdf"}
          />
        </>
      )}

      {selectedEvent === "send_location" && (
        <>
          <ConfigField
            label="Latitude"
            required
            value={values.lat ?? ""}
            onChange={(value) => setValue("lat", value, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(event) => openVariablePicker(event, "lat", "Latitude")}
            placeholder="28.6139"
          />
          <ConfigField
            label="Longitude"
            required
            value={values.lng ?? ""}
            onChange={(value) => setValue("lng", value, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(event) => openVariablePicker(event, "lng", "Longitude")}
            placeholder="77.2090"
          />
          <ConfigField
            label="Place name"
            value={values.name ?? ""}
            onChange={(value) => setValue("name", value, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(event) => openVariablePicker(event, "name", "Place name")}
            placeholder="Customer location"
          />
          <ConfigField
            label="Address"
            value={values.address ?? ""}
            onChange={(value) => setValue("address", value, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(event) => openVariablePicker(event, "address", "Address")}
            placeholder="Street, city"
          />
        </>
      )}

      <WebhookVariablePicker
        isOpen={popupState.isOpen}
        fieldLabel={popupState.fieldLabel}
        position={popupState.position}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
        onSelect={onSelectVariable}
        onClose={() => setPopupState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
