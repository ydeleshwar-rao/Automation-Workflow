"use client";

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/src/lib/utils";

import { flattenWebhookPayload } from "@/src/components/template/autoMapper";
import { useAutoMap } from "@/src/components/template/useAutoMap";

import { ConfigField, ConfigTextArea } from "@/src/components/work-flow/components/ChipTextField";
import { SelectionPopup } from "@/src/components/ui/selection-popup";
import {
  WebhookVariablePicker,
  VariableField,
} from "@/src/components/work-flow/components/WebhookVariablePicker";

import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";
import { getActiveClientKey } from "@/src/store/localStorage";
import { SM8_EVENT_FIELDS, Sm8FieldDef } from "./configure/fields";

// ─── Select field ─────────────────────────────────────────────────────────────

function Sm8SelectField({
  field,
  value,
  onChange,
  onPlusClick,
}: {
  field: Sm8FieldDef;
  value: string;
  onChange: (val: string) => void;
  onPlusClick: (e: React.MouseEvent) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, right: 0 });

  const selectedOption = field.options?.find((o) => o.value === value);

  const handleOpen = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupPos({ top: rect.top, right: window.innerWidth - rect.left + 10 });
    setIsOpen(true);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative group">
        <div
          onClick={handleOpen}
          className={cn(
            "w-full h-11 px-4 bg-background border border-border rounded-lg flex items-center justify-between cursor-pointer transition-all hover:border-primary shadow-sm",
            isOpen && "ring-2 ring-primary/20 border-primary"
          )}
        >
          <span className={cn("text-sm font-medium", selectedOption ? "text-foreground" : "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : (field.placeholder || "Choose value...")}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-[1px] h-4 bg-border mx-1" />
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPlusClick(e); }}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-border bg-muted text-muted-foreground hover:text-primary hover:border-primary hover:bg-background transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <SelectionPopup
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSelect={(item) => { onChange(item.id); setIsOpen(false); }}
          type="value"
          selectedId={value}
          sections={[{
            id: "options",
            title: field.label,
            items: (field.options || []).map((o) => ({ id: o.value, label: o.label })),
            defaultOpen: true,
          }]}
          title={`Select ${field.label}`}
          position={popupPos}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ServiceM8ConfigureStepProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>, isValid: boolean) => void;
  webhookId?: string;
  selectedEvent?: string | null;
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
}

export function ServiceM8ConfigureStep({
  data,
  onChange,
  webhookId,
  selectedEvent,
  triggerTestPayload,
  triggerTestSamples,
}: ServiceM8ConfigureStepProps) {
  const [queueOptions, setQueueOptions] = useState<{ label: string; value: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const clientkey = getActiveClientKey();
    if (!clientkey) return;

    const needsQueues =
      selectedEvent === "job_queued" ||
      selectedEvent === "move_job_to_queue" ||
      selectedEvent === "update_job" ||
      selectedEvent === "job_quote_accepted";
    const needsCategories =
      selectedEvent === "job_queued" ||
      selectedEvent === "job_completed" ||
      selectedEvent === "job_quote_sent" ||
      selectedEvent === "job_quote_accepted";

    if (needsQueues) {
      axiosInstance
        .get(API_ROUTES.SERVICEM8.QUEUES, { headers: { clientkey } })
        .then((res) => {
          const queues = res.data?.data ?? res.data ?? [];
          setQueueOptions(
            queues
              .filter((q: any) => q?.uuid)
              .map((q: any) => ({ label: q.name, value: q.uuid }))
          );
        })
        .catch((err) => console.error("Failed to fetch queues:", err));
    }

    if (needsCategories) {
      axiosInstance
        .get(API_ROUTES.SERVICEM8.CATEGORIES, { headers: { clientkey } })
        .then((res) => {
          const categories = res.data?.data ?? res.data ?? [];
          setCategoryOptions(
            categories
              .filter((c: any) => c?.uuid)
              .map((c: any) => ({ label: c.name, value: c.uuid }))
          );
        })
        .catch((err) => console.error("Failed to fetch categories:", err));
    }
  }, [selectedEvent]);

  const fields: Sm8FieldDef[] = useMemo(() => {
    if (!selectedEvent) return [];
    const base = SM8_EVENT_FIELDS[selectedEvent] ?? [];
    return base.map((f) => {
      if (f.name === "queue_uuid" && queueOptions.length > 0) {
        return { ...f, options: queueOptions };
      }
      if (f.name === "category_uuid" && categoryOptions.length > 0) {
        return { ...f, options: categoryOptions };
      }
      return f;
    });
  }, [selectedEvent, queueOptions, categoryOptions]);

  const fieldKeys = useMemo(() => fields.map((f) => f.name), [fields]);

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

  const { watch, setValue, getValues } = useForm<Record<string, any>>({
    mode: "onChange",
    defaultValues: useMemo(() => {
      const defaults: Record<string, any> = { ...data };
      // Ensure select fields default to "" so placeholder shows (not null)
      fields.forEach((f) => {
        if (f.type === "select" && (defaults[f.name] == null || defaults[f.name] === "null")) {
          defaults[f.name] = "";
        }
      });
      return defaults;
    }, []),
  });

  const formValues = watch();

  useEffect(() => {
    if (selectedEvent === "create_client") return;
    if (!auto.isAutoMapped) return;
    if (!webhookPayloadKey || webhookPayloadKey === "{}") return;
    if (appliedPayloadRef.current === webhookPayloadKey) return;
    appliedPayloadRef.current = webhookPayloadKey;

    fields.forEach((f) => {
      // Dropdowns must stay empty until the user actively picks a value —
      // auto-mapping a free-text suggestion into a select would pre-select
      // a UUID the user never chose.
      if (f.type === "select") return;
      const key = f.name;
      const suggested = auto.formValues[key];
      if (suggested === undefined || suggested === null || String(suggested) === "") return;
      const current = getValues(key);
      const curStr = current === undefined || current === null ? "" : String(current).trim();
      if (curStr !== "") return;
      setValue(key, String(suggested), { shouldValidate: true, shouldDirty: false });
    });
  }, [
    selectedEvent,
    webhookPayloadKey,
    auto.isAutoMapped,
    auto.formValues,
    fields,
    getValues,
    setValue,
  ]);

  // Notify parent on every change
  useEffect(() => {
    const requiredFields = fields.filter((f) => f.required);
    const isValid = requiredFields.every((f) => !!formValues[f.name]);
    onChange(formValues, isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues), fields]);

  // ── Variable picker ──────────────────────────────────────────────────────
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    fieldName: string | null;
    position: { top: number; right: number };
  }>({ isOpen: false, fieldName: null, position: { top: 0, right: 0 } });

  const activeFieldRef = useRef<string | null>(null);

  const handlePlusClick = useCallback((e: React.MouseEvent, fieldName: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    activeFieldRef.current = fieldName;
    setPopupState({
      isOpen: true,
      fieldName,
      position: { top: rect.top, right: window.innerWidth - rect.left + 10 },
    });
  }, []);

  const closePopup = useCallback(() => {
    setPopupState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const onSelectVariable = useCallback(
    (variable: VariableField) => {
      const fieldName = activeFieldRef.current;
      if (!fieldName) return;
      const current = getValues(fieldName) || "";
      const token = `{{map:${variable.id}|${variable.label}|${variable.description}}}`;
      setValue(fieldName, `${current}${token}`, { shouldValidate: true, shouldDirty: true });
      closePopup();
    },
    [getValues, setValue, closePopup]
  );

  const popupFieldLabel = popupState.fieldName
    ? popupState.fieldName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  // ── No event selected ────────────────────────────────────────────────────
  if (!selectedEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
        <p className="text-sm font-bold text-foreground">No action event selected</p>
        <p className="text-xs text-muted-foreground">Go back to Setup and choose an action event first.</p>
      </div>
    );
  }

  // ── No fields defined for this event ────────────────────────────────────
  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
        <p className="text-sm font-bold text-foreground">No fields for this event</p>
        <p className="text-xs text-muted-foreground">Fields for &quot;{selectedEvent}&quot; have not been configured yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <form className="space-y-6">
        {fields.map((field) => {
          if (field.type === "select") {
            return (
              <div key={field.name}>
                <Sm8SelectField
                  field={field}
                  value={formValues[field.name] || ""}
                  onChange={(val) => setValue(field.name, val, { shouldValidate: true, shouldDirty: true })}
                  onPlusClick={(e) => handlePlusClick(e, field.name)}
                />
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={field.name}>
                <ConfigTextArea
                  label={field.label}
                  required={field.required}
                  value={String(formValues[field.name] ?? "")}
                  onChange={(val) => setValue(field.name, val, { shouldValidate: true, shouldDirty: true })}
                  onPlusClick={(e) => handlePlusClick(e, field.name)}
                  placeholder={field.placeholder || "Enter text or insert data..."}
                />
              </div>
            );
          }

          // default: text
          return (
            <div key={field.name}>
              <ConfigField
                label={field.label}
                required={field.required}
                value={String(formValues[field.name] ?? "")}
                onChange={(val) => setValue(field.name, val, { shouldValidate: true, shouldDirty: true })}
                onPlusClick={(e) => handlePlusClick(e, field.name)}
                placeholder={field.placeholder || "Enter text or insert data..."}
              />
            </div>
          );
        })}
      </form>

      <WebhookVariablePicker
        isOpen={popupState.isOpen}
        fieldLabel={popupFieldLabel}
        position={popupState.position}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
        onSelect={onSelectVariable}
        onClose={closePopup}
      />
    </div>
  );
}
