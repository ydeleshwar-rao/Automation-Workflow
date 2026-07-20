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
  const { watch, setValue, getValues } = useForm<WhatsAppConfig>({
    mode: "onChange",
    defaultValues: {
      to: data.to ?? "",
      message: data.message ?? "",
      url: data.url ?? "",
      caption: data.caption ?? "",
      filename: data.filename ?? "",
      mimetype: data.mimetype ?? "",
      templateName: data.templateName ?? "",
      language: data.language ?? "en",
      lat: data.lat ?? "",
      lng: data.lng ?? "",
      name: data.name ?? "",
      address: data.address ?? "",
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

  const openVariablePicker = useCallback((e: React.MouseEvent, field: keyof WhatsAppConfig, label: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
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
        onChange={(val) => setValue("to", val, { shouldValidate: true, shouldDirty: true })}
        onPlusClick={(e) => openVariablePicker(e, "to", "Recipient phone")}
        placeholder="919876543210"
      />

      {(selectedEvent === "send_text_message" || selectedEvent === "send_template_message") && (
        <ConfigTextArea
          label={selectedEvent === "send_template_message" ? "Template body" : "Message"}
          required
          value={values.message ?? ""}
          onChange={(val) => setValue("message", val, { shouldValidate: true, shouldDirty: true })}
          onPlusClick={(e) => openVariablePicker(e, "message", "Message")}
          placeholder="Enter message or insert data..."
        />
      )}

      {selectedEvent === "send_template_message" && (
        <>
          <ConfigField
            label="Template name"
            value={values.templateName ?? ""}
            onChange={(val) => setValue("templateName", val, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(e) => openVariablePicker(e, "templateName", "Template name")}
            placeholder="appointment_reminder"
          />
          <ConfigField
            label="Language"
            value={values.language ?? ""}
            onChange={(val) => setValue("language", val, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(e) => openVariablePicker(e, "language", "Language")}
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
            onChange={(val) => setValue("url", val, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(e) => openVariablePicker(e, "url", "File URL")}
            placeholder="https://example.com/file.pdf"
          />
          <ConfigField
            label="Caption"
            value={values.caption ?? ""}
            onChange={(val) => setValue("caption", val, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(e) => openVariablePicker(e, "caption", "Caption")}
            placeholder="Optional caption"
          />
          {selectedEvent === "send_document" && (
            <ConfigField
              label="Filename"
              value={values.filename ?? ""}
              onChange={(val) => setValue("filename", val, { shouldValidate: true, shouldDirty: true })}
              onPlusClick={(e) => openVariablePicker(e, "filename", "Filename")}
              placeholder="invoice.pdf"
            />
          )}
          <ConfigField
            label="MIME type"
            value={values.mimetype ?? ""}
            onChange={(val) => setValue("mimetype", val, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(e) => openVariablePicker(e, "mimetype", "MIME type")}
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
            onChange={(val) => setValue("lat", val, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(e) => openVariablePicker(e, "lat", "Latitude")}
            placeholder="28.6139"
          />
          <ConfigField
            label="Longitude"
            required
            value={values.lng ?? ""}
            onChange={(val) => setValue("lng", val, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(e) => openVariablePicker(e, "lng", "Longitude")}
            placeholder="77.2090"
          />
          <ConfigField
            label="Place name"
            value={values.name ?? ""}
            onChange={(val) => setValue("name", val, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(e) => openVariablePicker(e, "name", "Place name")}
            placeholder="Customer location"
          />
          <ConfigField
            label="Address"
            value={values.address ?? ""}
            onChange={(val) => setValue("address", val, { shouldValidate: true, shouldDirty: true })}
            onPlusClick={(e) => openVariablePicker(e, "address", "Address")}
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
